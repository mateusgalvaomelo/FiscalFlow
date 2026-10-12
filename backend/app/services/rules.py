from datetime import timedelta

from fastapi import HTTPException
from sqlalchemy import select

from ..clock import business_today
from ..models import Configuracao, Documento, Evento, Justificativa, Pendencia, now

DEFAULT_CONFIG = {
    "categorias": {
        "classificacao": {"prazo_dias": 5, "severidade": "media", "exige_justificativa": False},
        "atribuicao": {"prazo_dias": 3, "severidade": "alta", "exige_justificativa": False},
        "validacao": {"prazo_dias": 7, "severidade": "alta", "exige_justificativa": True},
        "duplicidade": {"prazo_dias": 2, "severidade": "critica", "exige_justificativa": True},
    },
    "notificacao_dias": 2,
}


def config(db):
    return db.get(Configuracao, 1).parametros


def audit(db, entidade, entidade_id, acao, user=None, anterior=None, novo=None):
    db.add(
        Evento(
            entidade=entidade,
            entidade_id=entidade_id,
            usuario_id=user,
            acao=acao,
            valor_anterior=str(anterior) if anterior is not None else None,
            valor_novo=str(novo) if novo is not None else None,
        )
    )


def evaluate(db, doc, opened=None):
    """Create at most one issue per rule and document; duplicates are suspects, never merged."""
    types = []
    if doc.projeto_id is None:
        types.append(("classificacao", "Projeto não identificado. Vincule um projeto."))
    if doc.responsavel_id is None:
        types.append(("atribuicao", "Responsável ausente. Atribua um responsável."))
    if doc.data_emissao > doc.data_recebimento or doc.data_vencimento < doc.data_emissao:
        types.append(("validacao", "Datas obrigatórias inconsistentes. Corrija e justifique."))
    duplicate = db.scalar(
        select(Documento.id).where(
            Documento.id != doc.id,
            Documento.fornecedor_id == doc.fornecedor_id,
            Documento.numero_documento == doc.numero_documento,
            Documento.data_emissao == doc.data_emissao,
        )
    )
    if duplicate:
        types.append(
            (
                "duplicidade",
                f"Possível duplicidade com documento #{duplicate}; requer revisão humana.",
            )
        )
    existing = {
        p.tipo: p for p in db.scalars(select(Pendencia).where(Pendencia.documento_id == doc.id))
    }
    params = config(db)["categorias"]
    for tipo, descricao in types:
        if tipo not in existing:
            start = opened or now()
            p = Pendencia(
                documento_id=doc.id,
                tipo=tipo,
                descricao=descricao,
                severidade=params[tipo]["severidade"],
                data_abertura=start,
                prazo_resolucao=(opened.date() if opened else business_today())
                + timedelta(days=params[tipo]["prazo_dias"]),
                responsavel_id=doc.responsavel_id,
            )
            db.add(p)
            db.flush()
            audit(db, "pendencia", p.id, "pendencia_criada", novo=tipo)
        elif existing[tipo].status == "encerrada" and tipo != "duplicidade":
            # A corrected field becoming invalid again starts a new resolution cycle.
            # A reviewed duplicate remains accepted instead of reopening on unrelated edits.
            p = existing[tipo]
            p.status = "aberta"
            p.data_abertura = opened or now()
            p.data_encerramento = None
            p.prazo_resolucao = (opened.date() if opened else business_today()) + timedelta(
                days=params[tipo]["prazo_dias"]
            )
            p.responsavel_id = doc.responsavel_id
            audit(db, "pendencia", p.id, "pendencia_reaberta", anterior="encerrada", novo="aberta")
    refresh_document(db, doc)


def refresh_document(db, doc):
    db.flush()
    active = list(
        db.scalars(
            select(Pendencia).where(
                Pendencia.documento_id == doc.id, Pendencia.status != "encerrada"
            )
        )
    )
    status = (
        "inconsistente"
        if any(p.tipo in ("validacao", "duplicidade") for p in active)
        else "pendente"
        if active
        else "regular"
    )
    if doc.status != status:
        audit(db, "documento", doc.id, "status_atualizado", anterior=doc.status, novo=status)
        doc.status = status


def close_issue(db, p, user):
    if p.status == "encerrada":
        raise HTTPException(409, "Pendência já encerrada.")
    doc = db.get(Documento, p.documento_id)
    if p.tipo == "classificacao" and doc.projeto_id is None:
        raise HTTPException(409, "Vincule um projeto antes de encerrar.")
    if p.tipo == "atribuicao" and doc.responsavel_id is None:
        raise HTTPException(409, "Atribua um responsável ao documento antes de encerrar.")
    if p.tipo == "validacao" and (
        doc.data_emissao > doc.data_recebimento or doc.data_vencimento < doc.data_emissao
    ):
        raise HTTPException(409, "Corrija as datas inconsistentes antes de encerrar.")
    if config(db)["categorias"][p.tipo]["exige_justificativa"]:
        approved = db.scalar(
            select(Justificativa.id).where(
                Justificativa.pendencia_id == p.id,
                Justificativa.status == "aprovada",
                Justificativa.data_envio >= p.data_abertura,
            )
        )
        if not approved:
            raise HTTPException(409, "Esta categoria exige justificativa aprovada.")
    before = p.status
    p.status = "encerrada"
    p.data_encerramento = now()
    audit(db, "pendencia", p.id, "pendencia_encerrada", user, before, p.status)
    refresh_document(db, doc)


def eligible(db, p):
    return (
        p.status in ("aberta", "em_tratamento")
        and p.responsavel_id is not None
        and p.prazo_resolucao <= business_today() + timedelta(days=config(db)["notificacao_dias"])
    )
