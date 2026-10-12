# Pipeline ETL

1. Recebimento multipart limitado a 10 MB.
2. Extensão CSV/XLSX e conteúdo legível. CSV UTF-8, separador detectado; XLSX sem macros, conteúdo descompactado <=50 MB.
3. Schema com número, fornecedor, emissão, recebimento, vencimento, valor e descrição.
4. IDs inteiros, valor Decimal positivo com duas casas; máximo 16 dígitos e moeda BRL.
5. Datas ISO ou `DD/MM/AAAA`; data inválida rejeitada.
6. Espaços removidos, cabeçalhos padronizados e células vazias normalizadas.
7. Identidade fornecedor+número+emissão já existente é rejeitada; duplicidades no mesmo arquivo também.
8. Fornecedor, projeto e responsável precisam existir se preenchidos.
9. Regras classificam documento e criam pendências idempotentes; datas logicamente inconsistentes geram pendência, em vez de rejeição de schema.
10. Cada linha aceita usa savepoint; lote e métricas são confirmados juntos.
11. Contagem de lidas/aceitas/rejeitadas, duração e status persistidos em importações.
12. Linhas rejeitadas preservadas em JSON e disponibilizadas como CSV com motivo.

CSV de rejeições e exportação do dataset neutralizam valores iniciados por símbolos de fórmula, inclusive após espaços. Arquivos não são executados nem salvos com seu nome original em caminhos do servidor. A aba `documentos_fiscais` tem preferência no Excel; sem ela, usa a primeira aba. Importação é síncrona e limitada a 10.000 linhas. Importações concorrentes são serializadas por lock no registro de configuração do PostgreSQL.

Reprocessar um arquivo não insere novamente identidades aceitas; um novo registro de importação documenta as rejeições. O dataset inicial contém duplicidades intencionais carregadas pelo seed; a pipeline de importação protege contra novas repetições dessas identidades. O modelo pode ser baixado em `/api/modelo-importacao` e a planilha completa em `/api/dataset`.
