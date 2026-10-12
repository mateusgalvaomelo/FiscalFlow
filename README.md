# FiscalFlow

**Gestão de recebimento fiscal, da planilha à regularização.**

Plataforma open source de demonstração para a empresa fictícia **Atlas Operações**. Centraliza recebimentos, classifica inconsistências, organiza pendências e oferece justificativas revisáveis, notificações simuladas e indicadores calculados sobre o banco.

O problema: documentos e respostas dispersos tornam prazos, responsáveis e decisões difíceis de acompanhar. O objetivo do FiscalFlow é transformar esse processo em um fluxo consistente e rastreável, além de demonstrar engenharia de software e de dados com ferramentas gratuitas.

![Dashboard real da aplicação](docs/screenshots/dashboard.png)

## Executar com Docker

Pré-requisitos: Docker Desktop/Engine ativo e Docker Compose. Na raiz:

```sh
docker compose up --build
```

Abra **http://localhost:3000**. API e Swagger: **http://localhost:8000/docs**. As migrações e a carga inicial executam automaticamente. PostgreSQL fica na rede interna do Compose; frontend e API são publicados apenas em loopback. A primeira construção precisa de internet para baixar imagens e dependências. Execuções seguintes usam a base persistente.

`.env.example` documenta as configurações opcionais; não é necessário copiar o arquivo para a demonstração padrão. Os valores de acesso ao banco são exclusivamente locais e fictícios.

```sh
docker compose down
```

O volume mantém os dados. Para reiniciar a demonstração, use **Configurações → Restaurar demonstração** e confirme explicitamente na interface.

## Executar sem Docker

Requer Python 3.11+ e Node 22.12+ (Node 24 recomendado). A alternativa usa SQLite na raiz; os fluxos e as regras permanecem no backend.

Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-local.ps1
# Para parar os dois processos iniciados pelo script:
powershell -ExecutionPolicy Bypass -File scripts/stop-local.ps1
```

Ou manualmente, em dois terminais. No Windows, ative com `.venv\Scripts\Activate.ps1` depois de criar o ambiente; no Linux/macOS, use o comando abaixo:

```sh
python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
pip install -r backend/requirements.txt
alembic -c backend/alembic.ini upgrade head
uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

```sh
npm ci --prefix frontend
npm run dev --prefix frontend
```

Para utilizar PostgreSQL sem Docker Compose, configure `DATABASE_URL=postgresql+psycopg://usuario:senha@localhost:5432/fiscalflow` em seu ambiente antes de executar migrações e backend. O backend lê variáveis de ambiente; um arquivo `.env` isolado não é carregado automaticamente pela execução manual.

## Funcionalidades

- Dashboard com oito KPIs, séries mensais e distribuições de categoria, severidade, status, projeto e área; filtros de período, projeto, fornecedor, área e status.
- Recebimento com busca por documento/fornecedor, ordenação e paginação; detalhes, correção de dados, pendências e histórico.
- Fila de pendências com atribuição, justificativa, prazo e estados de revisão/encerramento.
- Aprovação ou devolução de justificativas; bloqueio de encerramento quando critérios não foram atendidos.
- Central com seleção de pendências, prévia, caixa de saída e envio **simulado**, limitado a uma cobrança por ocorrência por dia.
- Upload CSV/XLSX com validações, aceitação parcial, métricas, relatório de rejeições e reprocessamento idempotente.
- Projetos, fornecedores, parâmetros de regras, temas claro/escuro e restauração confirmada.
- Dataset Excel com tabelas, cabeçalhos e dicionário de dados; CSVs versionáveis.

**Perfis demonstrativos:** selecione administrador, revisor ou operador no cabeçalho. `X-Demo-User` identifica o usuário fictício na API. Revisão exige revisor/administrador; configurações e restauração exigem administrador. Operadores podem corrigir documentos, atribuir pendências, enviar justificativas, importar e registrar cobranças. Não há autenticação real nem isolamento por responsável. Este mecanismo **não é apropriado para exposição pública**.

## Stack e arquitetura

React, TypeScript, Vite, Tailwind CSS, Lucide, Recharts, TanStack Query, React Router, React Hook Form e Zod. FastAPI, Pydantic, SQLAlchemy, Alembic, PostgreSQL, Pandas, OpenPyXL, Faker e NumPy. Pytest, Ruff, ESLint, Playwright e GitHub Actions.

```mermaid
flowchart LR
  Browser[Navegador :3000] --> Front[React / Nginx ou Vite]
  Front --> API[FastAPI :8000]
  API --> Rules[Motor de regras e métricas]
  API --> ETL[Pipeline CSV / XLSX]
  Rules --> ORM[SQLAlchemy]
  ETL --> ORM
  ORM --> DB[(PostgreSQL / SQLite local)]
  Seed[Faker + NumPy, semente 42] --> ORM
  Seed --> Data[CSVs e Excel sintéticos]
```

```mermaid
erDiagram
  usuarios ||--o{ projetos : gerencia
  usuarios ||--o{ documentos_fiscais : responde
  fornecedores ||--o{ documentos_fiscais : fornece
  projetos o|--o{ documentos_fiscais : classifica
  documentos_fiscais ||--o{ pendencias : possui
  usuarios o|--o{ pendencias : trata
  pendencias ||--o{ justificativas : recebe
  usuarios ||--o{ justificativas : envia
  pendencias ||--o{ cobrancas : recebe
  usuarios ||--o{ cobrancas : destinatario
  usuarios o|--o{ historico_eventos : atua
```

Regras e persistência residem no backend. O frontend não inventa indicadores ou resultados de operação. Valores monetários usam `Numeric(16,2)`/`Decimal`; datas de negócio são `date`, eventos usam timezone UTC. A importação passa por leitura, schema, tipos, datas, textos, duplicidades, referências, regras, persistência e relatório. Datas incoerentes são aceitas como documentos inconsistentes; erros de formato ou referências inexistentes são rejeitados.

## Dados sintéticos

A carga contém **1.500 documentos, 45 projetos, 80 fornecedores e 65 usuários**, gerados com semente **42**, com janela de recebimento ancorada em **11/10/2026**. Há documentos regulares, duplicidades intencionais, projeto/responsável ausentes, datas inconsistentes, pendências resolvidas, devoluções e cobranças. O vencimento operacional é avaliado em relação à data da execução; por isso muda ao longo do tempo.

```sh
python scripts/generate_data.py
# Docker:
docker compose exec backend python -c "from app.db import SessionLocal; from app.services.seed import export_dataset; db=SessionLocal(); print(export_dataset(db)); db.close()"
```

O script inicializa apenas uma base vazia e exporta a base atual em `data/synthetic/`. Para gerar novamente o estado original, restaure pela interface antes de exportar. Nenhum identificador é um CPF/CNPJ ou documento fiscal válido; emails utilizam domínios reservados `.example`. Nomes são explicitamente rotulados como fictícios.

## Qualidade

```sh
ruff check backend tests scripts
pytest -q
npm run lint --prefix frontend
npm run build --prefix frontend
# Com backend e frontend em execução:
cd frontend
npx playwright install chromium
npm run test:e2e
```

Os testes cobrem regras, autorizações, revisão e rastreabilidade, idempotência de cobrança, ingestão parcial, CSV/XLSX, moeda, formatos inválidos, neutralização de fórmulas e métricas com dados controlados. Playwright cobre dashboard, justificativa/aprovação, importação, tema e navegação móvel, e gera uma captura real em `docs/screenshots/`. A CI inclui um serviço PostgreSQL e migração/carga antes do fluxo no navegador. Resultados da validação desta entrega: [docs/validation.md](docs/validation.md).

Os testes de navegador restauram os dados da demonstração no início e antes da captura final. Execute-os somente contra sua instância local dedicada a dados fictícios.

## API

Swagger contém os schemas, parâmetros e exemplos interativos.

| Recurso | Operações |
| --- | --- |
| `/api/health` | Saúde do banco e API |
| `/api/dashboard` | Métricas filtradas |
| `/api/documentos` | Listagem; `/{id}` detalhes e PATCH de correção |
| `/api/projetos`, `/api/fornecedores`, `/api/usuarios` | Cadastros fictícios |
| `/api/pendencias` | Fila; `/{id}/responsavel` PATCH; `/{id}/encerrar` POST |
| `/api/justificativas` | GET/POST; `/{id}/revisar` POST |
| `/api/cobrancas` | GET/POST; `/previa` POST |
| `/api/importacoes` | GET/POST multipart; `/{id}/rejeicoes` CSV |
| `/api/configuracoes` | GET/PUT |
| `/api/historico` | Eventos paginados, filtráveis por entidade e ID |
| `/api/dataset`, `/api/modelo-importacao` | Downloads |
| `/api/demo/restaurar` | POST com `{"confirmacao":"RESTAURAR"}` |

```sh
curl "http://localhost:8000/api/documentos?pagina=1&tamanho=20&status=inconsistente"
curl "http://localhost:8000/api/dashboard?projeto_id=1"
curl -X POST http://localhost:8000/api/importacoes -H "X-Demo-User: 1" -F "file=@data/synthetic/documentos_fiscais.csv"
```

Importar o dataset já carregado rejeita identidades existentes, demonstrando idempotência. Para inserir um exemplo novo, baixe o modelo da interface. A primeira linha do modelo pode ser importada uma vez.

## Documentação e roteiro

[Arquitetura](docs/architecture.md) · [Modelo de dados](docs/data-model.md) · [Regras](docs/business-rules.md) · [ETL](docs/etl-pipeline.md) · [Decisões](docs/technical-decisions.md) · [Guia de cinco minutos](docs/demo-guide.md)

## Limitações e roadmap

Importações são síncronas, limitadas a 10 MB e 10.000 linhas. Dashboard usa agregação centralizada em memória sobre o conjunto filtrado; o objetivo é demonstração, sem alegação de escala/performance. Não há fila distribuída, armazenamento de anexos fiscais, edição completa de cadastros ou autenticação de produção. A revisão não aplica segregação entre autor e revisor; os perfis são livres na demonstração. O restauro apaga a base de demonstração inteira, e deve ser usado exclusivamente numa instância dedicada a dados fictícios. Datas e campos corrigidos não apagam automaticamente pendências: o usuário precisa cumprir o fluxo de encerramento.

Próximas evoluções: autenticação e escopo de acesso adequados, segregação de revisão, processamento assíncrono de arquivos grandes, agregações SQL, filtros avançados na fila e CRUD de cadastros. A migração inicial é congelada em operações explícitas; evoluções de schema devem ter revisões incrementais. Configure `VITE_REPOSITORY_URL` no build para exibir o link real de GitHub na tela Sobre; nenhum repositório remoto é presumido.

## Independência e licença

Projeto independente, sem vínculo com clientes ou sistemas corporativos. Todos os dados e as regras são fictícios e criados para demonstração. Não realiza escrituração fiscal, apuração de tributos ou integração com órgãos públicos. Código original sob [MIT](LICENSE); dependências mantêm suas licenças próprias.
