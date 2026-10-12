from datetime import timedelta

from app.clock import business_today
from app.models import Evento, Pendencia
from app.services.rules import evaluate
from sqlalchemy import select


def test_health_pagination_and_errors(client):
    assert client.get("/api/health").json()["status"] == "ok"
    assert client.get("/api/documentos?pagina=0").status_code == 422
    assert client.get("/api/documentos/9999999").status_code == 404
    assert client.get("/api/dashboard?inicio=2026-10-01&fim=2026-09-01").status_code == 422


def test_review_workflow_authorization_and_history(client, db, make_doc):
    first = make_doc(numero_documento="WORKFLOW")
    duplicate = make_doc(numero_documento="WORKFLOW")
    evaluate(db, duplicate)
    db.commit()
    issue = db.scalar(select(Pendencia).where(Pendencia.documento_id == duplicate.id))
    body = {
        "pendencia_id": issue.id,
        "texto": "Documento duplicado sintético conferido; segunda via administrativa autorizada.",
    }
    submitted = client.post("/api/justificativas", json=body, headers={"X-Demo-User": "3"})
    assert submitted.status_code == 201
    assert client.post("/api/justificativas", json=body).status_code == 409
    identity = submitted.json()["id"]
    review = {"decisao": "aprovada", "comentario": "Segunda via demonstrativa validada."}
    assert (
        client.post(
            f"/api/justificativas/{identity}/revisar", json=review, headers={"X-Demo-User": "3"}
        ).status_code
        == 403
    )
    approved = client.post(
        f"/api/justificativas/{identity}/revisar", json=review, headers={"X-Demo-User": "2"}
    )
    assert approved.status_code == 200
    assert client.get(f"/api/documentos/{duplicate.id}").json()["status"] == "regular"
    assert client.post(f"/api/justificativas/{identity}/revisar", json=review).status_code == 409
    actions = [e.acao for e in db.scalars(select(Evento))]
    assert "justificativa_enviada" in actions
    assert "justificativa_aprovada" in actions
    assert "pendencia_encerrada" in actions
    assert first.status == "regular"


def test_return_and_failed_approval_rollback(client, db, make_doc):
    doc = make_doc(projeto_id=None)
    evaluate(db, doc)
    db.commit()
    p = db.scalar(select(Pendencia))
    j = client.post(
        "/api/justificativas",
        json={
            "pendencia_id": p.id,
            "texto": "Projeto ainda aguardando classificação demonstrativa.",
        },
    ).json()
    failed = client.post(
        f"/api/justificativas/{j['id']}/revisar",
        json={"decisao": "aprovada", "comentario": "Tentativa sem correção."},
    )
    assert failed.status_code == 409
    rows = client.get("/api/justificativas?status=em_revisao").json()["items"]
    assert any(row["id"] == j["id"] for row in rows)
    assert (
        client.get(f"/api/documentos/{doc.id}").json()["pendencias"][0]["status"]
        == "aguardando_revisao"
    )
    assert (
        client.post(
            f"/api/justificativas/{j['id']}/revisar",
            json={"decisao": "devolvida", "comentario": "Identifique o projeto."},
        ).status_code
        == 200
    )
    assert p.status == "em_tratamento"


def test_charge_idempotence(client, db, make_doc):
    doc = make_doc(projeto_id=None)
    evaluate(db, doc)
    p = db.scalar(select(Pendencia))
    p.prazo_resolucao = business_today() - timedelta(days=1)
    db.commit()
    body = {"pendencia_ids": [p.id]}
    assert client.post("/api/cobrancas/previa", json=body).status_code == 200
    assert client.post("/api/cobrancas", json=body).json()["enviadas"] == [p.id]
    assert client.post("/api/cobrancas", json=body).json()["ignoradas_ja_enviadas_hoje"] == [p.id]


def test_settings_permissions(client):
    config = client.get("/api/configuracoes").json()
    assert (
        client.put("/api/configuracoes", json=config, headers={"X-Demo-User": "3"}).status_code
        == 403
    )
    config["categorias"]["duplicidade"]["prazo_dias"] = 0
    assert client.put("/api/configuracoes", json=config).status_code == 422
    assert client.post("/api/demo/restaurar", json={"confirmacao": "SIM"}).status_code == 422
