import io
from datetime import date
from decimal import Decimal

import pandas as pd
import pytest
from app.models import Documento
from app.services.etl import ingest, read_file, safe_csv
from app.services.metrics import dashboard
from app.services.rules import evaluate
from fastapi import HTTPException
from sqlalchemy import func, select

CSV = (
    "numero_documento,fornecedor_id,projeto_id,responsavel_id,data_emissao,data_recebimento,data_vencimento,valor,descricao\n"
    "ETL-1,1,1,3,01/10/2026,02/10/2026,01/11/2026,1200.50,Documento fictício\n"
    "ETL-2,999,1,3,2026-10-01,2026-10-02,2026-11-01,80.00,Referência inexistente\n"
    "ETL-3,1,1,3,invalida,2026-10-02,2026-11-01,80.00,Data incorreta\n"
)


def test_partial_ingestion_and_idempotence(db):
    first = ingest(db, "exemplo.csv", CSV.encode("utf-8"), 1)
    assert (first.registros_lidos, first.registros_validos, first.registros_rejeitados) == (3, 1, 2)
    second = ingest(db, "exemplo.csv", CSV.encode("utf-8"), 1)
    assert second.registros_validos == 0
    assert db.scalar(select(func.count()).select_from(Documento)) == 1
    assert "já existente" in second.rejeicoes[0]["motivo"]


@pytest.mark.parametrize(
    "name,content",
    [
        ("arquivo.exe", b"abc"),
        ("arquivo.csv", b""),
        ("arquivo.xlsx", b"not zip"),
        ("arquivo.csv", b"coluna\nvalor"),
    ],
)
def test_invalid_uploads(name, content):
    with pytest.raises(HTTPException):
        read_file(name, content)


def test_xlsx_and_brl_normalization(db):
    frame = pd.read_csv(io.StringIO(CSV)).head(1)
    frame["valor"] = "1.234,56"
    buffer = io.BytesIO()
    frame.to_excel(buffer, index=False, sheet_name="documentos_fiscais")
    result = ingest(db, "teste.xlsx", buffer.getvalue(), 1)
    assert result.registros_validos == 1
    assert db.scalar(select(Documento)).valor == Decimal("1234.56")


def test_formula_injection_neutralized():
    value = safe_csv([{"numero_documento": ' =HYPERLINK("x")', "motivo": "teste"}]).decode(
        "utf-8-sig"
    )
    assert "' =HYPERLINK" in value


def test_controlled_metrics_and_consistent_filters(db, make_doc):
    make_doc(valor=Decimal("100.50"), numero_documento="A")
    doc = make_doc(valor=Decimal("200.25"), numero_documento="B", projeto_id=None)
    evaluate(db, doc)
    db.commit()
    result = dashboard(db)
    assert result["kpis"]["documentos_recebidos"] == 2
    assert Decimal(result["kpis"]["valor_total"]) == Decimal("300.75")
    assert result["kpis"]["taxa_regularizacao"] == 50
    assert sum(x["documentos"] for x in result["mensal"]) == 2
    filtered = dashboard(db, projeto_id=1)
    assert filtered["kpis"]["documentos_recebidos"] == 1
    assert filtered["kpis"]["pendencias_abertas"] == 0
    empty = dashboard(db, inicio=date(2099, 1, 1))
    assert empty["kpis"]["taxa_regularizacao"] == 0
    assert empty["kpis"]["taxa_vencimento"] == 0
