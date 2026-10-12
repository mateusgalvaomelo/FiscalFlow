import io
import time
import zipfile
from decimal import Decimal
from pathlib import Path

import pandas as pd
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import select

from ..models import Configuracao, Documento, Fornecedor, Importacao, Projeto, Usuario
from ..schemas import DocumentoEntrada
from .rules import audit, evaluate

MAX_SIZE = 10 * 1024 * 1024
MAX_ROWS = 10000


def read_file(name, content):
    extension = Path(name).suffix.lower()
    if extension not in (".csv", ".xlsx"):
        raise HTTPException(400, "Formato permitido: CSV ou XLSX.")
    if not content or len(content) > MAX_SIZE:
        raise HTTPException(413, "Arquivo vazio ou maior que 10 MB.")
    try:
        if extension == ".xlsx":
            with zipfile.ZipFile(io.BytesIO(content)) as archive:
                if sum(x.file_size for x in archive.infolist()) > 50 * 1024 * 1024:
                    raise HTTPException(413, "Conteúdo descompactado excede 50 MB.")
                if any("vbaProject" in x.filename for x in archive.infolist()):
                    raise HTTPException(400, "Planilhas com macros não são permitidas.")
            book = pd.ExcelFile(io.BytesIO(content), engine="openpyxl")
            frame = pd.read_excel(
                book,
                sheet_name="documentos_fiscais" if "documentos_fiscais" in book.sheet_names else 0,
                dtype=str,
            )
        else:
            frame = pd.read_csv(
                io.BytesIO(content), sep=None, engine="python", dtype=str, encoding="utf-8-sig"
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(400, "Conteúdo inválido ou ilegível.") from exc
    frame.columns = frame.columns.str.strip().str.lower()
    if len(frame) > MAX_ROWS:
        raise HTTPException(413, "Limite de 10.000 linhas por importação.")
    required = {
        "numero_documento",
        "fornecedor_id",
        "data_emissao",
        "data_recebimento",
        "data_vencimento",
        "valor",
        "descricao",
    }
    if not required.issubset(frame.columns):
        raise HTTPException(
            400, f"Colunas ausentes: {', '.join(sorted(required - set(frame.columns)))}"
        )
    return frame


def normalize(row):
    clean = {
        str(k): (None if pd.isna(v) or str(v).strip() == "" else str(v).strip())
        for k, v in row.items()
    }
    for field in ("fornecedor_id", "projeto_id", "responsavel_id"):
        if clean.get(field) is not None:
            value = Decimal(clean[field])
            if value != value.to_integral_value():
                raise ValueError(f"{field}: identificador deve ser inteiro")
            clean[field] = int(value)
    for field in ("data_emissao", "data_recebimento", "data_vencimento"):
        value = clean.get(field)
        if value:
            clean[field] = pd.to_datetime(value, dayfirst="/" in value, errors="raise").date()
    if clean.get("valor"):
        value = clean["valor"]
        clean["valor"] = value.replace(".", "").replace(",", ".") if "," in value else value
    return DocumentoEntrada.model_validate(clean)


def ingest(db, name, content, user):
    started = time.perf_counter()
    frame = read_file(name, content)
    # Serialize imports on PostgreSQL so concurrent retries cannot insert the same identity.
    db.scalar(select(Configuracao).where(Configuracao.id == 1).with_for_update())
    rejected, accepted = [], 0
    for index, row in frame.iterrows():
        try:
            data = normalize(row.to_dict())
            for field, model in [
                ("fornecedor_id", Fornecedor),
                ("projeto_id", Projeto),
                ("responsavel_id", Usuario),
            ]:
                identity = getattr(data, field)
                if identity is not None and not db.get(model, identity):
                    raise ValueError(f"{field}: referência inexistente ({identity})")
            exists = db.scalar(
                select(Documento.id).where(
                    Documento.fornecedor_id == data.fornecedor_id,
                    Documento.numero_documento == data.numero_documento,
                    Documento.data_emissao == data.data_emissao,
                )
            )
            if exists:
                raise ValueError(f"Registro já existente: documento #{exists}")
            with db.begin_nested():
                doc = Documento(**data.model_dump())
                db.add(doc)
                db.flush()
                evaluate(db, doc)
                audit(db, "documento", doc.id, "documento_importado", user, novo=name)
            accepted += 1
        except (ValueError, ValidationError, ArithmeticError) as exc:
            rejected.append(
                {
                    "linha": int(index) + 2,
                    **{str(k): "" if pd.isna(v) else str(v) for k, v in row.items()},
                    "motivo": str(exc)[:1200],
                }
            )
    record = Importacao(
        nome_arquivo=Path(name).name[:200],
        registros_lidos=len(frame),
        registros_validos=accepted,
        registros_rejeitados=len(rejected),
        status="concluida" if not rejected else "com_rejeicoes",
        tempo_execucao=Decimal(str(round(time.perf_counter() - started, 3))),
        rejeicoes=rejected,
    )
    db.add(record)
    db.flush()
    audit(
        db,
        "importacao",
        record.id,
        "importacao_concluida",
        user,
        novo=f"{accepted} aceitos; {len(rejected)} rejeitados",
    )
    db.commit()
    return record


def safe_csv(rows):
    frame = pd.DataFrame(rows)
    # Neutralize spreadsheet formula injection, including leading whitespace.
    for column in frame:
        frame[column] = frame[column].map(
            lambda v: (
                "'" + str(v) if str(v).lstrip().startswith(("=", "+", "-", "@", "\t", "\r")) else v
            )
        )
    return frame.to_csv(index=False).encode("utf-8-sig")
