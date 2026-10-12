from collections import Counter, defaultdict
from decimal import Decimal

from sqlalchemy import select

from ..clock import business_today
from ..models import Documento, Fornecedor, Pendencia, Projeto


def document_query(
    busca="", status=None, projeto_id=None, fornecedor_id=None, area=None, inicio=None, fim=None
):
    query = select(Documento)
    if busca:
        supplier = select(Fornecedor.id).where(Fornecedor.razao_social.ilike(f"%{busca}%"))
        query = query.where(
            Documento.numero_documento.ilike(f"%{busca}%") | Documento.fornecedor_id.in_(supplier)
        )
    for column, value in [
        (Documento.status, status),
        (Documento.projeto_id, projeto_id),
        (Documento.fornecedor_id, fornecedor_id),
    ]:
        if value is not None:
            query = query.where(column == value)
    if area:
        query = query.where(
            Documento.projeto_id.in_(select(Projeto.id).where(Projeto.area == area))
        )
    if inicio:
        query = query.where(Documento.data_recebimento >= inicio)
    if fim:
        query = query.where(Documento.data_recebimento <= fim)
    return query


def dashboard(db, **filters):
    docs = list(db.scalars(document_query(**filters)))
    ids = [d.id for d in docs]
    issues = (
        list(db.scalars(select(Pendencia).where(Pendencia.documento_id.in_(ids)))) if ids else []
    )
    active = [p for p in issues if p.status != "encerrada"]
    closed = [p for p in issues if p.status == "encerrada" and p.data_encerramento]
    overdue = sum(p.prazo_resolucao < business_today() for p in active)
    total = len(docs)
    status = Counter(d.status for d in docs)
    monthly = defaultdict(lambda: {"documentos": 0, "regulares": 0, "valor": Decimal(0)})
    values = defaultdict(lambda: Decimal(0))
    projects = {p.id: p for p in db.scalars(select(Projeto))}
    areas = Counter()
    mapping = {d.id: d for d in docs}
    for d in docs:
        month = d.data_recebimento.strftime("%Y-%m")
        monthly[month]["documentos"] += 1
        monthly[month]["regulares"] += int(d.status == "regular")
        monthly[month]["valor"] += d.valor
        values[d.projeto_id] += d.valor
    for p in active:
        project = projects.get(mapping[p.documento_id].projeto_id)
        areas[project.area if project else "Sem projeto"] += 1

    def distribution(counter):
        return [{"nome": key, "quantidade": value} for key, value in counter.items()]

    return {
        "kpis": {
            "documentos_recebidos": total,
            "valor_total": str(sum((d.valor for d in docs), Decimal(0))),
            "documentos_regulares": status["regular"],
            "documentos_pendentes": status["pendente"],
            "documentos_inconsistentes": status["inconsistente"],
            "pendencias_vencidas": overdue,
            "pendencias_abertas": len(active),
            "taxa_regularizacao": round(status["regular"] / total * 100, 2) if total else 0,
            "taxa_vencimento": round(overdue / len(active) * 100, 2) if active else 0,
            "tempo_medio_resolucao": round(
                sum((p.data_encerramento - p.data_abertura).total_seconds() / 86400 for p in closed)
                / len(closed),
                2,
            )
            if closed
            else 0,
        },
        "mensal": [
            {
                "mes": key,
                **value,
                "valor": str(value["valor"]),
                "taxa": round(value["regulares"] / value["documentos"] * 100, 2),
            }
            for key, value in sorted(monthly.items())
        ],
        "categorias": distribution(Counter(p.tipo for p in active)),
        "severidades": distribution(Counter(p.severidade for p in active)),
        "status": distribution(status),
        "areas": distribution(areas),
        "projetos": [
            {"nome": projects[key].nome if key in projects else "Sem projeto", "valor": str(value)}
            for key, value in sorted(values.items(), key=lambda x: x[1], reverse=True)[:8]
        ],
    }
