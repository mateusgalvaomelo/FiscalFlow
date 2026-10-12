# Arquitetura

Monorepo local com `frontend/`, `backend/`, `data/`, `scripts/`, `tests/` e `docs/`. React consome `/api` por Vite no desenvolvimento ou Nginx no container. FastAPI mantém os casos de uso, SQLAlchemy a persistência, Alembic as migrações e PostgreSQL o banco no Compose. SQLite é uma alternativa explícita para execução sem Docker.

`app/routes/api.py` concentra transporte REST, dependências e autorização demonstrativa. `schemas.py` valida entradas com Pydantic. `services/rules.py` implementa avaliação, prazos, encerramento e auditoria. `services/etl.py` separa leitura, normalização e ingestão. `services/metrics.py` compartilha os filtros e define agregações. `services/seed.py` gera e exporta dados.

Cada mutação confirma a transação somente após aplicar suas regras. A sessão fecha e desfaz mudanças não confirmadas em falhas. Revisão/encerramento usam locks de linha no PostgreSQL, e unicidade limita pendências por categoria e cobranças por dia. Leitura por perfil não implica autenticação: o header é controlado pelo próprio usuário.

CORS aceita somente os endereços locais configurados. Os containers publicados usam loopback; PostgreSQL permanece interno. Health checks condicionam a subida do frontend à prontidão do backend e banco. A carga inicial só roda quando não há usuários.

Não há serviço externo, email real ou segredo corporativo. A exportação Excel é local, com tabelas, CSVs UTF-8 e dicionário. Os componentes de formulário e tabela usam HTML semântico, labels e foco; modais têm Escape e contenção de Tab. Responsividade e tema são implementados via CSS e preferências locais.
