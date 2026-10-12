from datetime import date, timedelta

import pytest
from app.clock import business_today
from app.models import Justificativa, Pendencia
from app.services.rules import close_issue, eligible, evaluate
from fastapi import HTTPException
from sqlalchemy import func, select


def test_regular_document(db, make_doc):
    doc = make_doc()
    evaluate(db, doc)
    assert doc.status == "regular"
    assert db.scalar(select(func.count()).select_from(Pendencia)) == 0


def test_missing_classification_assignment_and_idempotency(db, make_doc):
    doc = make_doc(projeto_id=None, responsavel_id=None)
    evaluate(db, doc)
    evaluate(db, doc)
    issues = list(db.scalars(select(Pendencia)))
    assert {p.tipo for p in issues} == {"classificacao", "atribuicao"}
    assert len(issues) == 2
    assert doc.status == "pendente"
    for p in issues:
        with pytest.raises(HTTPException):
            close_issue(db, p, 1)
    doc.projeto_id, doc.responsavel_id = 1, 3
    for p in issues:
        close_issue(db, p, 1)
    assert doc.status == "regular"


def test_duplicate_is_suspect_and_date_prevents_false_positive(db, make_doc):
    make_doc()
    duplicate = make_doc()
    evaluate(db, duplicate)
    assert (
        db.scalar(select(Pendencia).where(Pendencia.documento_id == duplicate.id)).tipo
        == "duplicidade"
    )
    other = make_doc(data_emissao=date(2026, 9, 30))
    evaluate(db, other)
    assert other.status == "regular"


def test_validation_requires_correction_and_approval(db, make_doc):
    doc = make_doc(data_emissao=date(2026, 10, 3))
    evaluate(db, doc)
    p = db.scalar(select(Pendencia))
    with pytest.raises(HTTPException):
        close_issue(db, p, 1)
    doc.data_emissao = doc.data_recebimento
    with pytest.raises(HTTPException):
        close_issue(db, p, 1)
    db.add(
        Justificativa(
            pendencia_id=p.id,
            usuario_id=3,
            texto="Dados corrigidos e conferidos.",
            status="aprovada",
        )
    )
    db.flush()
    close_issue(db, p, 1)
    assert p.status == "encerrada"
    assert doc.status == "regular"
    with pytest.raises(HTTPException):
        close_issue(db, p, 1)


def test_notification_deadline_boundaries(db, make_doc):
    doc = make_doc(projeto_id=None)
    evaluate(db, doc)
    p = db.scalar(select(Pendencia))
    p.prazo_resolucao = business_today() + timedelta(days=2)
    assert eligible(db, p)
    p.prazo_resolucao += timedelta(days=1)
    assert not eligible(db, p)


def test_recurrence_reopens_without_duplicating_and_old_approval_is_invalid(db, make_doc):
    doc = make_doc(data_emissao=date(2026, 10, 3))
    evaluate(db, doc)
    p = db.scalar(select(Pendencia))
    doc.data_emissao = doc.data_recebimento
    db.add(
        Justificativa(
            pendencia_id=p.id,
            usuario_id=3,
            texto="Datas corrigidas no primeiro ciclo.",
            status="aprovada",
        )
    )
    db.flush()
    close_issue(db, p, 1)
    doc.data_emissao = doc.data_recebimento + timedelta(days=1)
    evaluate(db, doc)
    assert p.status == "aberta"
    assert doc.status == "inconsistente"
    assert db.scalar(select(func.count()).select_from(Pendencia)) == 1
    doc.data_emissao = doc.data_recebimento
    with pytest.raises(HTTPException):
        close_issue(db, p, 1)
    p.prazo_resolucao = business_today() - timedelta(days=1)
    p.status = "aguardando_revisao"
    assert not eligible(db, p)
