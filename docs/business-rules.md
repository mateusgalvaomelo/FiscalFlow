# Regras de negócio

| Regra | Comportamento |
| --- | --- |
| 01 Projeto ausente | Abre `classificacao`; exige vínculo antes de encerrar |
| 02 Responsável ausente | Abre `atribuicao`; exige responsável no documento |
| 03 Divergência | Emissão posterior ao recebimento ou vencimento anterior à emissão abre `validacao`; exige corrigir datas |
| 04 Duplicidade | Fornecedor+número+emissão iguais sugerem duplicidade; não mescla nem apaga documentos; aprovação humana autoriza segunda via |
| 05 Prazo | Abertura + prazo configurado em dias corridos; mudanças de parâmetros afetam somente novas pendências |
| 06 Justificativa | Configurada por categoria; padrão obrigatório em validação e duplicidade |
| 07 Revisão | `em_revisao` permite aprovação ou devolução; aprovação só confirma se encerramento for válido |
| 08 Cobrança | Aberta/em tratamento, responsável definido e prazo <= hoje+antecedência; uma por dia, sempre simulada |
| 09 Encerramento | Dados exigidos corrigidos e justificativa aprovada quando necessária; reencerramento rejeitado |
| 10 Histórico | Registra criação, correção, atribuição, justificativa, revisão, cobrança, importação e status |

Estados de pendência: `aberta → em_tratamento/aguardando_revisao`; envio de justificativa aceita apenas aberta/em tratamento; devolução `aguardando_revisao → em_tratamento`; aprovação/encerramento válido `→ encerrada`. Uma pendência encerrada não pode ser atribuída ou justificada novamente. Regra avaliada duas vezes não duplica pendência: unicidade documento/categoria.

Documento com pendência de validação/duplicidade ativa é `inconsistente`; com outra pendência ativa, `pendente`; sem pendência ativa, `regular`. Corrigir o dado não encerra automaticamente ocorrências. Atribuição de pendência e atribuição do documento são conceitos independentes.

Se uma correção posterior remover projeto/responsável ou reintroduzir datas inconsistentes, a ocorrência encerrada daquela categoria é reaberta, sem duplicar registro, e inicia novo ciclo de prazo. Aprovações de ciclos anteriores não autorizam o novo encerramento. O histórico preserva os eventos anteriores, mas a métrica de resolução considera o ciclo atual da ocorrência. Duplicidades aprovadas não reabrem por edições não relacionadas, preservando a decisão humana.

Indicadores:

- Regularização: documentos regulares / recebidos × 100.
- Pendências vencidas: prazo < data atual, status diferente de encerrada; prazo hoje não é vencido.
- Taxa de vencimento: pendências vencidas / pendências ativas × 100.
- Tempo médio de resolução: média do intervalo abertura–encerramento em dias de todas as ocorrências encerradas do conjunto filtrado.
- Série mensal e regularização mensal: agrupadas pelo mês de recebimento do documento; regularização reflete o estado atual, não um snapshot histórico.
- Valores financeiros: somatório dos documentos, inclusive suspeitas de duplicidade preservadas; não representa contas a pagar nem passivo tributário.

Divisões sem denominador retornam zero. Todos os gráficos e indicadores usam os mesmos documentos filtrados. Pendências associadas são filtradas pelos IDs desse conjunto.

A data operacional usa `America/Sao_Paulo` por padrão, configurável com `BUSINESS_TIMEZONE`, independentemente do fuso do sistema ou container. Eventos são registrados como instantes UTC.
