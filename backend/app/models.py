from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def now():
    return datetime.now(timezone.utc)


class Usuario(Base):
    __tablename__ = "usuarios"
    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(160), unique=True)
    area: Mapped[str] = mapped_column(String(80), index=True)
    perfil: Mapped[str] = mapped_column(String(30))
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)


class Projeto(Base):
    __tablename__ = "projetos"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(String(30), unique=True)
    nome: Mapped[str] = mapped_column(String(120))
    descricao: Mapped[str] = mapped_column(Text)
    centro_custo: Mapped[str] = mapped_column(String(30))
    area: Mapped[str] = mapped_column(String(80), index=True)
    gestor_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    status: Mapped[str] = mapped_column(String(30), default="ativo")
    data_inicio: Mapped[date] = mapped_column(Date)
    data_fim_prevista: Mapped[date] = mapped_column(Date)


class Fornecedor(Base):
    __tablename__ = "fornecedores"
    id: Mapped[int] = mapped_column(primary_key=True)
    razao_social: Mapped[str] = mapped_column(String(160))
    identificador_ficticio: Mapped[str] = mapped_column(String(40), unique=True)
    categoria: Mapped[str] = mapped_column(String(60))
    email: Mapped[str] = mapped_column(String(160))
    status: Mapped[str] = mapped_column(String(30), default="ativo")


class Documento(Base):
    __tablename__ = "documentos_fiscais"
    __table_args__ = (
        Index("ix_documento_identidade", "fornecedor_id", "numero_documento", "data_emissao"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    numero_documento: Mapped[str] = mapped_column(String(60), index=True)
    fornecedor_id: Mapped[int] = mapped_column(ForeignKey("fornecedores.id"))
    projeto_id: Mapped[int | None] = mapped_column(
        ForeignKey("projetos.id"), nullable=True, index=True
    )
    data_emissao: Mapped[date] = mapped_column(Date)
    data_recebimento: Mapped[date] = mapped_column(Date, index=True)
    data_vencimento: Mapped[date] = mapped_column(Date)
    valor: Mapped[Decimal] = mapped_column(Numeric(16, 2))
    moeda: Mapped[str] = mapped_column(String(3), default="BRL")
    descricao: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="regular", index=True)
    responsavel_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)


class Pendencia(Base):
    __tablename__ = "pendencias"
    __table_args__ = (UniqueConstraint("documento_id", "tipo", name="uq_pendencia_regra"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    documento_id: Mapped[int] = mapped_column(ForeignKey("documentos_fiscais.id"), index=True)
    tipo: Mapped[str] = mapped_column(String(50))
    descricao: Mapped[str] = mapped_column(Text)
    severidade: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(30), default="aberta", index=True)
    data_abertura: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    prazo_resolucao: Mapped[date] = mapped_column(Date, index=True)
    data_encerramento: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    responsavel_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True)


class Justificativa(Base):
    __tablename__ = "justificativas"
    id: Mapped[int] = mapped_column(primary_key=True)
    pendencia_id: Mapped[int] = mapped_column(ForeignKey("pendencias.id"), index=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    texto: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="em_revisao")
    data_envio: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    data_revisao: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    comentario_revisor: Mapped[str | None] = mapped_column(Text, nullable=True)


class Cobranca(Base):
    __tablename__ = "cobrancas"
    __table_args__ = (UniqueConstraint("pendencia_id", "dia_envio", name="uq_cobranca_dia"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    pendencia_id: Mapped[int] = mapped_column(ForeignKey("pendencias.id"), index=True)
    destinatario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    canal: Mapped[str] = mapped_column(String(30), default="caixa_interna")
    data_envio: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    dia_envio: Mapped[date] = mapped_column(Date)
    tipo: Mapped[str] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(30), default="simulada")
    mensagem: Mapped[str] = mapped_column(Text)


class Evento(Base):
    __tablename__ = "historico_eventos"
    id: Mapped[int] = mapped_column(primary_key=True)
    entidade: Mapped[str] = mapped_column(String(40), index=True)
    entidade_id: Mapped[int] = mapped_column(Integer, index=True)
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True)
    acao: Mapped[str] = mapped_column(String(100))
    valor_anterior: Mapped[str | None] = mapped_column(Text, nullable=True)
    valor_novo: Mapped[str | None] = mapped_column(Text, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Importacao(Base):
    __tablename__ = "importacoes"
    id: Mapped[int] = mapped_column(primary_key=True)
    nome_arquivo: Mapped[str] = mapped_column(String(200))
    data_importacao: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    registros_lidos: Mapped[int] = mapped_column(Integer)
    registros_validos: Mapped[int] = mapped_column(Integer)
    registros_rejeitados: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(30))
    tempo_execucao: Mapped[Decimal] = mapped_column(Numeric(10, 3))
    rejeicoes: Mapped[list] = mapped_column(JSON, default=list)


class Configuracao(Base):
    __tablename__ = "configuracoes"
    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    parametros: Mapped[dict] = mapped_column(JSON)
