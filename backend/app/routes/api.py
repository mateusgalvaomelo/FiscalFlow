from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, UploadFile
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse, Response
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from ..clock import business_today
from ..db import get_db
from ..models import (
    Cobranca,
    Configuracao,
    Documento,
    Evento,
    Fornecedor,
    Importacao,
    Justificativa,
    Pendencia,
    Projeto,
    Usuario,
    now,
)
from ..schemas import (
    AtribuicaoEntrada,
    CobrancaEntrada,
    ConfiguracaoEntrada,
    CorrecaoEntrada,
    JustificativaEntrada,
    RestauracaoEntrada,
    RevisaoEntrada,
)
from ..services.etl import MAX_SIZE, ingest, safe_csv
from ..services.metrics import dashboard, document_query
from ..services.rules import audit, close_issue, config, eligible, evaluate
from ..services.seed import export_dataset, seed

router = APIRouter(prefix="/api")
DB = Annotated[Session, Depends(get_db)]


def actor(db: DB, x_demo_user: Annotated[int, Header()] = 1):
    user = db.get(Usuario, x_demo_user)
    if not user or not user.ativo:
        raise HTTPException(403, "Perfil demonstrativo inválido.")
    return user


Actor = Annotated[Usuario, Depends(actor)]


def authorize(user, profiles):
    if user.perfil not in profiles:
        raise HTTPException(403, "O perfil demonstrativo selecionado não permite esta ação.")


def get(db, model, identity, lock=False):
    item = (
        db.scalar(select(model).where(model.id == identity).with_for_update())
        if lock
        else db.get(model, identity)
    )
    if not item:
        raise HTTPException(404, "Registro não encontrado.")
    return item


def serialize(item):
    return jsonable_encoder({c.name: getattr(item, c.name) for c in item.__table__.columns})


def page(db, query, pagina=1, tamanho=20):
    count = db.scalar(select(func.count()).select_from(query.order_by(None).subquery()))
    rows = db.scalars(query.offset((pagina - 1) * tamanho).limit(tamanho))
    return {
        "items": [serialize(x) for x in rows],
        "total": count,
        "pagina": pagina,
        "tamanho": tamanho,
    }


def filters(
    busca: str = "",
    status: str | None = None,
    projeto_id: int | None = None,
    fornecedor_id: int | None = None,
    area: str | None = None,
    inicio: date | None = None,
    fim: date | None = None,
):
    if inicio and fim and inicio > fim:
        raise HTTPException(422, "O início deve ser anterior ao fim do período.")
    return dict(
        busca=busca,
        status=status,
        projeto_id=projeto_id,
        fornecedor_id=fornecedor_id,
        area=area,
        inicio=inicio,
        fim=fim,
    )


@router.get("/health")
def health(db: DB):
    db.execute(select(1))
    return {"status": "ok", "ambiente": "demonstracao", "autenticacao_real": False}


@router.get("/usuarios")
def users(db: DB):
    return [serialize(x) for x in db.scalars(select(Usuario).order_by(Usuario.id))]


@router.get("/dashboard")
def get_dashboard(db: DB, options: Annotated[dict, Depends(filters)]):
    return dashboard(db, **options)


@router.get("/documentos")
def documents(
    db: DB,
    options: Annotated[dict, Depends(filters)],
    pagina: int = Query(1, ge=1),
    tamanho: int = Query(20, ge=1, le=100),
    ordenar: str = "data_recebimento",
    direcao: str = "desc",
):
    columns = {
        "data_recebimento": Documento.data_recebimento,
        "valor": Documento.valor,
        "numero_documento": Documento.numero_documento,
    }
    if ordenar not in columns or direcao not in ("asc", "desc"):
        raise HTTPException(422, "Ordenação inválida.")
    column = columns[ordenar]
    result = page(
        db,
        document_query(**options).order_by(
            column.desc() if direcao == "desc" else column.asc(), Documento.id
        ),
        pagina,
        tamanho,
    )
    suppliers = {s.id: s.razao_social for s in db.scalars(select(Fornecedor))}
    projects = {p.id: p.nome for p in db.scalars(select(Projeto))}
    users_map = {u.id: u.nome for u in db.scalars(select(Usuario))}
    ids = [x["id"] for x in result["items"]]
    counts = dict(
        db.execute(
            select(Pendencia.documento_id, func.count())
            .where(Pendencia.documento_id.in_(ids), Pendencia.status != "encerrada")
            .group_by(Pendencia.documento_id)
        ).all()
    )
    for row in result["items"]:
        row.update(
            fornecedor=suppliers[row["fornecedor_id"]],
            projeto=projects.get(row["projeto_id"], "Não classificado"),
            responsavel=users_map.get(row["responsavel_id"], "Não atribuído"),
            pendencias=counts.get(row["id"], 0),
        )
    return result


@router.get("/documentos/{identity}")
def document_detail(identity: int, db: DB):
    doc = get(db, Documento, identity)
    issues = list(db.scalars(select(Pendencia).where(Pendencia.documento_id == identity)))
    ids = [p.id for p in issues]
    return {
        **serialize(doc),
        "fornecedor": serialize(get(db, Fornecedor, doc.fornecedor_id)),
        "projeto": serialize(db.get(Projeto, doc.projeto_id)) if doc.projeto_id else None,
        "pendencias": [serialize(p) for p in issues],
        "justificativas": [
            serialize(j)
            for j in db.scalars(select(Justificativa).where(Justificativa.pendencia_id.in_(ids)))
        ],
        "cobrancas": [
            serialize(c) for c in db.scalars(select(Cobranca).where(Cobranca.pendencia_id.in_(ids)))
        ],
        "historico": [
            serialize(e)
            for e in db.scalars(
                select(Evento)
                .where(
                    ((Evento.entidade == "documento") & (Evento.entidade_id == identity))
                    | ((Evento.entidade == "pendencia") & Evento.entidade_id.in_(ids))
                )
                .order_by(Evento.timestamp.desc(), Evento.id.desc())
            )
        ],
    }


@router.patch("/documentos/{identity}")
def correct_document(identity: int, body: CorrecaoEntrada, db: DB, user: Actor):
    doc = get(db, Documento, identity, True)
    for field, value in body.model_dump(exclude_unset=True).items():
        if field in ("projeto_id", "responsavel_id") and value is not None:
            get(db, Projeto if field == "projeto_id" else Usuario, value)
        if field.startswith("data_") and value is None:
            raise HTTPException(422, "Datas não podem ser nulas.")
        audit(db, "documento", doc.id, f"correcao_{field}", user.id, getattr(doc, field), value)
        setattr(doc, field, value)
    evaluate(db, doc)
    db.commit()
    return serialize(doc)


@router.get("/projetos")
def projects(db: DB):
    rows = [serialize(x) for x in db.scalars(select(Projeto).order_by(Projeto.id))]
    for row in rows:
        docs = list(db.scalars(select(Documento).where(Documento.projeto_id == row["id"])))
        row.update(
            documentos=len(docs),
            pendentes=sum(d.status != "regular" for d in docs),
            valor_total=str(sum((d.valor for d in docs), 0)),
        )
    return rows


@router.get("/fornecedores")
def suppliers(db: DB):
    return [serialize(x) for x in db.scalars(select(Fornecedor).order_by(Fornecedor.id))]


@router.get("/pendencias")
def issues(
    db: DB,
    status: str | None = None,
    tipo: str | None = None,
    severidade: str | None = None,
    busca: str = "",
    pagina: int = Query(1, ge=1),
    tamanho: int = Query(20, ge=1, le=100),
    elegiveis: bool = False,
):
    query = select(Pendencia)
    if status == "vencida":
        query = query.where(
            Pendencia.status != "encerrada", Pendencia.prazo_resolucao < business_today()
        )
    elif status:
        query = query.where(Pendencia.status == status)
    for column, value in [(Pendencia.tipo, tipo), (Pendencia.severidade, severidade)]:
        if value:
            query = query.where(column == value)
    if busca:
        query = query.where(
            Pendencia.descricao.ilike(f"%{busca}%")
            | Pendencia.documento_id.in_(
                select(Documento.id).where(Documento.numero_documento.ilike(f"%{busca}%"))
            )
        )
    if elegiveis:
        from datetime import timedelta

        query = query.where(
            Pendencia.status.in_(["aberta", "em_tratamento"]),
            Pendencia.responsavel_id.is_not(None),
            Pendencia.prazo_resolucao
            <= business_today() + timedelta(days=config(db)["notificacao_dias"]),
        )
    result = page(db, query.order_by(Pendencia.prazo_resolucao, Pendencia.id), pagina, tamanho)
    for row in result["items"]:
        doc = db.get(Documento, row["documento_id"])
        row.update(
            documento=doc.numero_documento,
            vencida=row["status"] != "encerrada"
            and date.fromisoformat(row["prazo_resolucao"]) < business_today(),
        )
    return result


@router.patch("/pendencias/{identity}/responsavel")
def assign(identity: int, body: AtribuicaoEntrada, db: DB, user: Actor):
    p = get(db, Pendencia, identity, True)
    if p.status == "encerrada":
        raise HTTPException(409, "Não é possível atribuir uma pendência encerrada.")
    get(db, Usuario, body.responsavel_id)
    audit(
        db,
        "pendencia",
        p.id,
        "responsavel_atribuido",
        user.id,
        p.responsavel_id,
        body.responsavel_id,
    )
    p.responsavel_id = body.responsavel_id
    p.status = "em_tratamento" if p.status == "aberta" else p.status
    db.commit()
    return serialize(p)


@router.post("/pendencias/{identity}/encerrar")
def close(identity: int, db: DB, user: Actor):
    p = get(db, Pendencia, identity, True)
    close_issue(db, p, user.id)
    db.commit()
    return serialize(p)


@router.get("/justificativas")
def justifications(
    db: DB,
    status: str | None = None,
    pagina: int = Query(1, ge=1),
    tamanho: int = Query(20, ge=1, le=100),
):
    query = select(Justificativa)
    if status:
        query = query.where(Justificativa.status == status)
    return page(db, query.order_by(Justificativa.id.desc()), pagina, tamanho)


@router.post("/justificativas", status_code=201)
def submit(body: JustificativaEntrada, db: DB, user: Actor):
    p = get(db, Pendencia, body.pendencia_id, True)
    if p.status not in ("aberta", "em_tratamento"):
        raise HTTPException(409, "Pendência encerrada ou já aguardando revisão.")
    j = Justificativa(pendencia_id=p.id, usuario_id=user.id, texto=body.texto.strip())
    if len(j.texto) < 15:
        raise HTTPException(422, "Justificativa deve conter pelo menos 15 caracteres úteis.")
    db.add(j)
    db.flush()
    audit(db, "pendencia", p.id, "justificativa_enviada", user.id, p.status, "aguardando_revisao")
    p.status = "aguardando_revisao"
    db.commit()
    return serialize(j)


@router.post("/justificativas/{identity}/revisar")
def review(identity: int, body: RevisaoEntrada, db: DB, user: Actor):
    authorize(user, ("administrador", "revisor"))
    j = get(db, Justificativa, identity, True)
    p = get(db, Pendencia, j.pendencia_id, True)
    if j.status != "em_revisao" or p.status != "aguardando_revisao":
        raise HTTPException(409, "Justificativa já revisada ou estado incompatível.")
    j.status, j.comentario_revisor, j.data_revisao = body.decisao, body.comentario, now()
    audit(
        db, "pendencia", p.id, "justificativa_" + body.decisao, user.id, "em_revisao", body.decisao
    )
    if body.decisao == "aprovada":
        db.flush()
        close_issue(db, p, user.id)
    else:
        p.status = "em_tratamento"
    db.commit()
    return serialize(j)


@router.get("/cobrancas")
def charges(db: DB, pagina: int = Query(1, ge=1), tamanho: int = Query(20, ge=1, le=100)):
    return page(db, select(Cobranca).order_by(Cobranca.id.desc()), pagina, tamanho)


@router.post("/cobrancas/previa")
def preview_charge(body: CobrancaEntrada, db: DB):
    result = []
    for identity in dict.fromkeys(body.pendencia_ids):
        p = get(db, Pendencia, identity)
        if not eligible(db, p):
            raise HTTPException(
                409, f"Pendência #{identity} não elegível: verifique prazo, responsável e status."
            )
        user = get(db, Usuario, p.responsavel_id)
        result.append(
            {
                "pendencia_id": identity,
                "destinatario": user.nome,
                "mensagem": f"Olá, {user.nome}. A pendência #{identity} ({p.tipo}) precisa de resposta até {p.prazo_resolucao:%d/%m/%Y}. Acesse o FiscalFlow para tratar o documento #{p.documento_id}. Notificação exclusivamente simulada.",
            }
        )
    return result


@router.post("/cobrancas", status_code=201)
def send_charge(body: CobrancaEntrada, db: DB, user: Actor):
    previews = preview_charge(body, db)
    sent, skipped = [], []
    for preview in previews:
        p = get(db, Pendencia, preview["pendencia_id"], True)
        exists = db.scalar(
            select(Cobranca.id).where(
                Cobranca.pendencia_id == p.id, Cobranca.dia_envio == business_today()
            )
        )
        if exists:
            skipped.append(p.id)
            continue
        item = Cobranca(
            pendencia_id=p.id,
            destinatario_id=p.responsavel_id,
            dia_envio=business_today(),
            tipo="vencida" if p.prazo_resolucao < business_today() else "lembrete",
            mensagem=preview["mensagem"],
        )
        db.add(item)
        audit(db, "pendencia", p.id, "cobranca_simulada", user.id, novo=preview["mensagem"])
        sent.append(p.id)
    db.commit()
    return {"enviadas": sent, "ignoradas_ja_enviadas_hoje": skipped}


@router.get("/importacoes")
def imports(db: DB):
    return [serialize(x) for x in db.scalars(select(Importacao).order_by(Importacao.id.desc()))]


@router.post("/importacoes", status_code=201)
async def upload(file: UploadFile, db: DB, user: Actor):
    content = await file.read(MAX_SIZE + 1)
    return serialize(ingest(db, file.filename or "arquivo", content, user.id))


@router.get("/importacoes/{identity}/rejeicoes")
def rejection_report(identity: int, db: DB):
    item = get(db, Importacao, identity)
    return Response(
        safe_csv(item.rejeicoes or [{"motivo": "Nenhuma rejeição"}]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=rejeicoes-{identity}.csv"},
    )


@router.get("/dataset")
def dataset(db: DB):
    path = export_dataset(db)
    return FileResponse(path, filename="dataset_demonstrativo.xlsx")


@router.get("/modelo-importacao")
def template():
    content = (
        "numero_documento,fornecedor_id,projeto_id,responsavel_id,data_emissao,data_recebimento,data_vencimento,valor,moeda,descricao\n"
        "IMPORT-EXEMPLO-001,1,1,7,2026-10-01,2026-10-02,2026-11-01,1250.00,BRL,Documento exclusivamente fictício\n"
    )
    return Response(
        content.encode("utf-8-sig"),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=modelo.csv"},
    )


@router.get("/configuracoes")
def settings(db: DB):
    return config(db)


@router.put("/configuracoes")
def update_settings(body: ConfiguracaoEntrada, db: DB, user: Actor):
    authorize(user, ("administrador",))
    if set(body.categorias) != set(config(db)["categorias"]):
        raise HTTPException(422, "Configure todas as quatro categorias.")
    item = get(db, Configuracao, 1, True)
    audit(
        db, "configuracao", 1, "parametros_atualizados", user.id, item.parametros, body.model_dump()
    )
    item.parametros = body.model_dump()
    db.commit()
    return item.parametros


@router.get("/historico")
def history(
    db: DB,
    entidade: str | None = None,
    entidade_id: int | None = None,
    pagina: int = Query(1, ge=1),
    tamanho: int = Query(20, ge=1, le=100),
):
    query = select(Evento)
    if entidade:
        query = query.where(Evento.entidade == entidade)
    if entidade_id:
        query = query.where(Evento.entidade_id == entidade_id)
    return page(db, query.order_by(Evento.timestamp.desc(), Evento.id.desc()), pagina, tamanho)


@router.post("/demo/restaurar")
def restore(body: RestauracaoEntrada, db: DB, user: Actor):
    authorize(user, ("administrador",))
    for model in (
        Evento,
        Cobranca,
        Justificativa,
        Pendencia,
        Importacao,
        Documento,
        Projeto,
        Fornecedor,
        Usuario,
        Configuracao,
    ):
        db.execute(delete(model))
    db.flush()
    seed(db)
    return {"status": "restaurada", "documentos": 1500}
