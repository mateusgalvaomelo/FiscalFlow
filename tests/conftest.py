from contextlib import asynccontextmanager
from datetime import date
from decimal import Decimal

import pytest
from app.db import Base, get_db
from app.main import app
from app.models import Configuracao, Documento, Fornecedor, Projeto, Usuario
from app.services.rules import DEFAULT_CONFIG
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )

    @event.listens_for(engine, "connect")
    def fk(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    with Session(engine, expire_on_commit=False) as session:
        session.add(Configuracao(id=1, parametros=DEFAULT_CONFIG))
        session.add_all(
            [
                Usuario(
                    id=i,
                    nome=f"Usuário fictício {i}",
                    email=f"user{i}@example.test",
                    area="Operações",
                    perfil=profile,
                )
                for i, profile in [(1, "administrador"), (2, "revisor"), (3, "operador")]
            ]
        )
        session.flush()
        session.add(
            Projeto(
                id=1,
                codigo="DEMO-001",
                nome="Projeto fictício",
                descricao="Teste",
                centro_custo="CC-1",
                area="Operações",
                gestor_id=1,
                data_inicio=date(2026, 1, 1),
                data_fim_prevista=date(2027, 1, 1),
            )
        )
        session.add(
            Fornecedor(
                id=1,
                razao_social="Fornecedor fictício",
                identificador_ficticio="FICTICIO-1",
                categoria="Serviços",
                email="supplier@example.test",
            )
        )
        session.commit()
        yield session
    engine.dispose()


@pytest.fixture
def client(db, monkeypatch):
    @asynccontextmanager
    async def test_lifespan(_):
        # Endpoint tests must never initialize or touch the developer's demo database.
        yield

    monkeypatch.setattr(app.router, "lifespan_context", test_lifespan)

    def test_session():
        try:
            yield db
        except Exception:
            db.rollback()
            raise

    app.dependency_overrides[get_db] = test_session
    with TestClient(app, raise_server_exceptions=True) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def make_doc(db):
    def create(**kwargs):
        values = dict(
            numero_documento="FICTICIO-TEST",
            fornecedor_id=1,
            projeto_id=1,
            responsavel_id=3,
            data_emissao=date(2026, 10, 1),
            data_recebimento=date(2026, 10, 2),
            data_vencimento=date(2026, 11, 1),
            valor=Decimal("100.50"),
            descricao="Documento de teste fictício",
        )
        values.update(kwargs)
        doc = Documento(**values)
        db.add(doc)
        db.flush()
        return doc

    return create
