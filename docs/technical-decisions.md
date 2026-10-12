# Decisões técnicas

- PostgreSQL é a execução de referência via Compose; SQLite facilita a demonstração sem serviço de banco instalado. Testes unitários usam banco isolado em memória.
- Perfis fictícios são seleção explícita, com autorização no backend para revisão e administração. Não há senha, token ou alegação de segurança de produção.
- JSON para configurações e rejeições reduz complexidade; as entidades centrais permanecem relacionais e usam FKs, índices e unicidade.
- Regras são funções de serviço desacopladas de rotas e testáveis com dados controlados. `Numeric` evita perda de precisão monetária na persistência.
- O dataset usa referência fixa 11/10/2026 e semente 42 para reprodução. Datas de eventos operacionais usam o relógio atual; vencimentos envelhecem naturalmente.
- UI usa componentes HTML acessíveis próprios, em vez de adicionar uma biblioteca visual inteira. Tailwind está integrado no Vite; CSS mantém tokens, layout e tema coerentes.
- Importação síncrona, gráficos agregados em memória e algumas consultas de cadastros por projeto são compromissos explícitos para 1.500 documentos. Não foi medida capacidade de produção.
- Cobranças usam outbox persistida interna. Nenhum SMTP ou provedor externo é necessário.
- A restauração exige confirmação literal no endpoint e modal no frontend, e opera somente na base dedicada à demonstração.
- A migração inicial está congelada em operações explícitas, com upgrade e downgrade. Alterações de schema futuras devem adicionar migrações incrementais sem modificar essa revisão.
