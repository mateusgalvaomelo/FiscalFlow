# Modelo de dados

O diagrama relacional está no README. As entidades são normalizadas em usuários, projetos, fornecedores, documentos fiscais, pendências, justificativas, cobranças, histórico, importações e configurações.

| Entidade | Integridade e índices |
| --- | --- |
| usuários | Email único; área indexada; perfil e ativo |
| projetos | Código único; gestor obrigatório FK usuário; área indexada |
| fornecedores | Identificador fictício único |
| documentos | FK fornecedor obrigatória; projeto/responsável opcionais; índice composto fornecedor+número+emissão; índices status e recebimento |
| pendências | FK documento; categoria única por documento; índices documento/status/prazo; responsável opcional |
| justificativas | FK pendência e usuário; índice pendência; data/comentário de revisão opcionais |
| cobranças | FK pendência/destinatário; unicidade pendência+dia de envio |
| histórico | FK usuário opcional; entidade e ID indexados; referência polimórfica mantida pelo serviço |
| importações | Métricas, duração e rejeições JSON |
| configurações | Registro único com parâmetros JSON validados no endpoint |

Dinheiro usa `Numeric(16,2)` e Decimal. Datas fiscais e de prazo são `date`. Eventos são `DateTime(timezone=True)` UTC; SQLite não preserva o offset nativamente e representa os instantes UTC sem sufixo. A interface apresenta datas em pt-BR. FKs são habilitadas explicitamente no SQLite. Possíveis documentos duplicados não têm uma restrição de identidade global, pois a própria demonstração deve preservá-los para revisão humana. A importação rejeita a mesma identidade antes de inserir.

Histórico usa referência polimórfica (entidade/ID), sem FK direta para cada entidade; essa decisão permite eventos para configurações e importações. O dataset Excel inclui um dicionário de todas as colunas exportadas. A migração inicial é congelada em operações Alembic explícitas e não depende do estado futuro dos modelos. Alterações de esquema devem introduzir migrações incrementais.
