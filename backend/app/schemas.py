from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class DocumentoEntrada(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    numero_documento: str = Field(min_length=1, max_length=60)
    fornecedor_id: int = Field(gt=0)
    projeto_id: int | None = Field(default=None, gt=0)
    responsavel_id: int | None = Field(default=None, gt=0)
    data_emissao: date
    data_recebimento: date
    data_vencimento: date
    valor: Decimal = Field(gt=0, max_digits=16, decimal_places=2)
    moeda: Literal["BRL"] = "BRL"
    descricao: str = Field(min_length=1, max_length=2000)


class JustificativaEntrada(BaseModel):
    pendencia_id: int
    texto: str = Field(min_length=15, max_length=5000)


class RevisaoEntrada(BaseModel):
    decisao: Literal["aprovada", "devolvida"]
    comentario: str = Field(min_length=5, max_length=2000)


class AtribuicaoEntrada(BaseModel):
    responsavel_id: int = Field(gt=0)


class CorrecaoEntrada(BaseModel):
    projeto_id: int | None = Field(default=None, gt=0)
    responsavel_id: int | None = Field(default=None, gt=0)
    data_emissao: date | None = None
    data_recebimento: date | None = None
    data_vencimento: date | None = None


class CobrancaEntrada(BaseModel):
    pendencia_ids: list[int] = Field(min_length=1, max_length=100)


class Categoria(BaseModel):
    prazo_dias: int = Field(ge=1, le=90)
    severidade: Literal["baixa", "media", "alta", "critica"]
    exige_justificativa: bool


class ConfiguracaoEntrada(BaseModel):
    categorias: dict[Literal["classificacao", "atribuicao", "validacao", "duplicidade"], Categoria]
    notificacao_dias: int = Field(ge=0, le=30)


class RestauracaoEntrada(BaseModel):
    confirmacao: Literal["RESTAURAR"]
