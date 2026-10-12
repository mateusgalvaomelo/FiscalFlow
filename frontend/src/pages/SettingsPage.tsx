import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { api, label } from "../api";
import type { Notify } from "../App";
import { ErrorState, Heading, Loading, Modal } from "../components";
import type { Settings } from "../types";

export function SettingsPage({
  notify,
  profile,
  toggleTheme,
}: {
  notify: Notify;
  profile: string;
  toggleTheme: () => void;
}) {
  const query = useQuery({
    queryKey: ["configuracoes"],
    queryFn: () => api<Settings>("/configuracoes"),
  });
  const [draft, setDraft] = useState<Settings | null>(null);
  const [restore, setRestore] = useState(false);
  const [saving, setSaving] = useState(false);
  const client = useQueryClient();
  const value = draft || query.data;
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/configuracoes", {
        method: "PUT",
        body: JSON.stringify(value),
      });
      await client.invalidateQueries();
      notify("Parâmetros atualizados. Aplicam-se às novas pendências.");
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  };
  const reset = async () => {
    setSaving(true);
    try {
      await api("/demo/restaurar", {
        method: "POST",
        body: JSON.stringify({ confirmacao: "RESTAURAR" }),
      });
      await client.invalidateQueries();
      setDraft(null);
      setRestore(false);
      notify("Demonstração restaurada com 1.500 documentos fictícios.");
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <Heading
        eyebrow="PREFERÊNCIAS E REGRAS"
        title="Configurações"
        description="Ajuste os parâmetros do seu ambiente demonstrativo."
      />
      {query.isLoading ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : (
        value && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Motor de regras</h2>
                <p>
                  Alterações válidas para novas ocorrências. Pendências
                  existentes mantêm seus prazos.
                </p>
              </div>
            </div>
            <form onSubmit={save}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th>Prazo (dias corridos)</th>
                      <th>Severidade</th>
                      <th>Exige justificativa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(value.categorias).map(([key, c]) => (
                      <tr key={key}>
                        <td>{label(key)}</td>
                        <td>
                          <input
                            aria-label={`Prazo ${key}`}
                            type="number"
                            min={1}
                            max={90}
                            required
                            value={c.prazo_dias}
                            onChange={(e) =>
                              setDraft({
                                ...value,
                                categorias: {
                                  ...value.categorias,
                                  [key]: {
                                    ...c,
                                    prazo_dias: Number(e.target.value),
                                  },
                                },
                              })
                            }
                          />
                        </td>
                        <td>
                          <select
                            aria-label={`Severidade ${key}`}
                            value={c.severidade}
                            onChange={(e) =>
                              setDraft({
                                ...value,
                                categorias: {
                                  ...value.categorias,
                                  [key]: { ...c, severidade: e.target.value },
                                },
                              })
                            }
                          >
                            {["baixa", "media", "alta", "critica"].map((x) => (
                              <option key={x} value={x}>
                                {label(x)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Justificativa obrigatória ${key}`}
                            checked={c.exige_justificativa}
                            onChange={(e) =>
                              setDraft({
                                ...value,
                                categorias: {
                                  ...value.categorias,
                                  [key]: {
                                    ...c,
                                    exige_justificativa: e.target.checked,
                                  },
                                },
                              })
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="settings-bottom">
                <label>
                  Antecedência dos lembretes (dias)
                  <input
                    type="number"
                    min={0}
                    max={30}
                    required
                    value={value.notificacao_dias}
                    onChange={(e) =>
                      setDraft({
                        ...value,
                        notificacao_dias: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <button
                  className="button"
                  disabled={saving || profile !== "administrador"}
                >
                  Salvar parâmetros
                </button>
              </div>
            </form>
            {profile !== "administrador" && (
              <p className="form-hint">
                Selecione o perfil administrador para alterar parâmetros ou
                restaurar dados.
              </p>
            )}
          </section>
        )
      )}
      <div className="detail-grid">
        <section className="panel preference">
          <h2>Aparência</h2>
          <p>
            Escolha o tema para o seu ambiente. A preferência fica salva neste
            navegador.
          </p>
          <button className="button secondary" onClick={toggleTheme}>
            Alternar claro / escuro
          </button>
        </section>
        <section className="panel preference restore">
          <h2>Restaurar demonstração</h2>
          <p>
            Substitui todos os dados desta base local pelos registros fictícios
            iniciais, incluindo importações e ações registradas.
          </p>
          <button
            className="button danger"
            disabled={profile !== "administrador"}
            onClick={() => setRestore(true)}
          >
            <RotateCcw size={15} />
            Restaurar demonstração
          </button>
        </section>
      </div>
      {restore && (
        <Modal
          title="Restaurar dados fictícios?"
          onClose={() => setRestore(false)}
        >
          <p>
            Esta ação apaga os documentos importados, justificativas, cobranças
            e configurações desta demonstração. A base volta aos 1.500
            documentos iniciais.
          </p>
          <div className="modal-actions">
            <button onClick={() => setRestore(false)}>Cancelar</button>
            <button className="button danger" disabled={saving} onClick={reset}>
              {saving ? "Restaurando…" : "Confirmar restauração"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
