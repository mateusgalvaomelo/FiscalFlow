from collections import Counter

from app.db import Base
from app.models import Documento, Fornecedor, Pendencia, Projeto, Usuario
from app.services.seed import seed
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session


def test_seed_counts_relationships_and_repeatability():
    samples = []
    for _ in range(2):
        engine = create_engine("sqlite://")
        Base.metadata.create_all(engine)
        with Session(engine) as db:
            seed(db, export=False)
            for model, count in [(Usuario, 65), (Projeto, 45), (Fornecedor, 80), (Documento, 1500)]:
                assert db.scalar(select(func.count()).select_from(model)) == count
            seed(db, export=False)
            assert db.scalar(select(func.count()).select_from(Documento)) == 1500
            docs = list(db.scalars(select(Documento).order_by(Documento.id)))
            users = set(db.scalars(select(Usuario.id)))
            projects = set(db.scalars(select(Projeto.id)))
            suppliers = set(db.scalars(select(Fornecedor.id)))
            user_areas = {u.id: u.area for u in db.scalars(select(Usuario))}
            project_areas = {p.id: p.area for p in db.scalars(select(Projeto))}
            assert all(
                project_areas[d.projeto_id] == user_areas[d.responsavel_id]
                for d in docs
                if d.projeto_id and d.responsavel_id
            )
            assert all(
                d.fornecedor_id in suppliers
                and (d.projeto_id is None or d.projeto_id in projects)
                and (d.responsavel_id is None or d.responsavel_id in users)
                for d in docs
            )
            states = Counter(p.status for p in db.scalars(select(Pendencia)))
            assert (
                states["encerrada"] > 0
                and states["aguardando_revisao"] > 0
                and states["em_tratamento"] > 0
            )
            samples.append(
                [
                    (d.numero_documento, d.fornecedor_id, d.data_emissao, d.valor, d.updated_at)
                    for d in docs
                ]
            )
        engine.dispose()
    assert samples[0] == samples[1]
