# Validação executada

Validação desta entrega em **11/10/2026**, no workspace Windows informado pelo usuário. Nenhuma cobertura percentual ou benchmark foi estimado.

| Verificação | Resultado observado |
| --- | --- |
| Instalação Python e npm | Concluída; dependências diretas Python fixadas e lockfile npm incluído |
| Ruff | Sem erros em backend, testes e scripts |
| Pytest | 20 testes aprovados |
| ESLint | Sem erros |
| TypeScript + Vite | Build de produção concluído |
| Migração SQLite | Upgrade, downgrade e novo upgrade executados; `alembic check` sem diferenças |
| Execução local sem Docker | API `/api/health` ok e frontend HTTP 200; SQLite carregado automaticamente |
| Docker Compose | Imagens construídas; PostgreSQL, backend e frontend iniciados com health checks saudáveis |
| Migração PostgreSQL | Executada na inicialização; `alembic check` sem diferenças |
| Playwright sobre Docker/PostgreSQL | 2 testes aprovados: revisão, cobrança, importação idempotente, tema, telas e navegação móvel |
| Download Excel via API | Arquivo aberto com OpenPyXL; 1.500 documentos, 45 projetos, 80 fornecedores, 65 usuários e aba de dicionário |
| Conferência dos indicadores | Quantidade e soma monetária do dashboard iguais aos CSVs exportados: 1.500 documentos e R$ 29.896.093,79 |
| Screenshot | Captura real em `screenshots/dashboard.png`, revisada visualmente |

Os testes unitários usam SQLite isolado e não inicializam o banco do desenvolvedor. O teste do gerador compara duas bases novas e verifica contagens, referências, alinhamento de áreas e reprodução dos valores/timestamps exportados. Os fluxos de navegador foram executados primeiro na alternativa local e, após os ajustes finais, na stack Docker com PostgreSQL. A demonstração foi restaurada ao final para manter os 1.500 registros iniciais.

O PostgreSQL exigiu sincronizar as sequências SERIAL após carregar IDs explícitos; o fluxo de importação real foi testado após essa correção. A migração inicial está congelada em operações Alembic explícitas.

Avisos não bloqueantes observados: depreciação do transporte HTTPX no TestClient da versão instalada do Starlette, e comentários de anotação de otimização em Zod removidos pelo Rollup. Não impediram testes ou build.

GitHub Actions foi configurado, mas não houve execução em um repositório remoto nesta entrega. Não houve publicação no GitHub ou em hospedagem externa. Os containers locais ficaram em execução para permitir a exploração imediata.
