import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, brl, date, label } from "../api";
import type { Notify } from "../App";
import {
  Badge,
  Empty,
  ErrorState,
  Heading,
  Loading,
  Modal,
} from "../components";
import type { Detail, Issue, Project, User } from "../types";

import { JustifyModal } from "../JustifyModal";
export function DetailPage({ notify }: { notify: Notify }) {
  const { id } = useParams();
  const client = useQueryClient();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [closeId, setCloseId] = useState<number | null>(null);
  const query = useQuery({
    queryKey: ["documento", id],
    queryFn: () => api<Detail>(`/documentos/${id}`),
  });
  const projects = useQuery({
    queryKey: ["projetos"],
    queryFn: () => api<Project[]>("/projetos"),
  });
  const users = useQuery({
    queryKey: ["usuarios"],
    queryFn: () => api<User[]>("/usuarios"),
  });
  const d = query.data;
  const correct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const values = Object.fromEntries(form);
    try {
      await api(`/documentos/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...values,
          projeto_id: values.projeto_id ? Number(values.projeto_id) : null,
          responsavel_id: values.responsavel_id
            ? Number(values.responsavel_id)
            : null,
        }),
      });
      await client.invalidateQueries();
      notify("Dados corrigidos e regras reavaliadas.");
      setEdit(false);
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  };
  const close = async () => {
    setSaving(true);
    try {
      await api(`/pendencias/${closeId}/encerrar`, { method: "POST" });
      await client.invalidateQueries();
      notify("Pendência encerrada.");
      setCloseId(null);
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <Link className="back-link" to="/documentos">
        <ArrowLeft size={15} />
        Voltar ao recebimento
      </Link>
      {query.isLoading ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : (
        d && (
          <>
            <Heading
              eyebrow="DETALHES DO DOCUMENTO"
              title={d.numero_documento}
              description={d.fornecedor.razao_social}
              action={
                <button
                  className="button secondary"
                  onClick={() => setEdit(true)}
                >
                  Corrigir dados
                </button>
              }
            />
            <div className="detail-grid">
              <section className="panel">
                <div className="panel-heading">
                  <h2>Informações do recebimento</h2>
                  <Badge value={d.status} />
                </div>
                <dl className="details">
                  {[
                    ["Valor", brl(d.valor)],
                    ["Projeto", d.projeto?.nome || "Não classificado"],
                    ["Emissão", date(d.data_emissao)],
                    ["Recebimento", date(d.data_recebimento)],
                    ["Vencimento", date(d.data_vencimento)],
                    [
                      "Responsável",
                      users.data?.find((u) => u.id === d.responsavel_id)
                        ?.nome || "Não atribuído",
                    ],
                  ].map(([name, value]) => (
                    <div key={name}>
                      <dt>{name}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="description">{d.descricao}</p>
              </section>
              <section className="panel tour">
                <span className="eyebrow">ROTEIRO DE DEMONSTRAÇÃO</span>
                <h2>Da pendência à regularização</h2>
                <ol>
                  <li>Corrija os dados necessários.</li>
                  <li>Registre uma justificativa abaixo.</li>
                  <li>Em Justificativas, selecione perfil revisor e aprove.</li>
                  <li>Consulte o histórico e o impacto no dashboard.</li>
                </ol>
                <Link to="/justificativas">
                  Abrir fila de revisão <ArrowRight size={15} />
                </Link>
              </section>
            </div>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Pendências associadas</h2>
                  <p>{d.pendencias.length} ocorrência(s) registradas</p>
                </div>
              </div>
              {!d.pendencias.length ? (
                <Empty />
              ) : (
                <div className="issue-list">
                  {d.pendencias.map((p) => (
                    <div className="issue-row" key={p.id}>
                      <div>
                        <div className="issue-title">
                          <b>
                            #{p.id} · {label(p.tipo)}
                          </b>
                          <Badge value={p.severidade} />
                          <Badge value={p.status} />
                        </div>
                        <p>{p.descricao}</p>
                        <small>Prazo: {date(p.prazo_resolucao)}</small>
                      </div>
                      {["aberta", "em_tratamento"].includes(p.status) && (
                        <div className="row-actions">
                          <button onClick={() => setIssue(p)}>
                            Justificar
                          </button>
                          <button onClick={() => setCloseId(p.id)}>
                            Encerrar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
            <div className="detail-grid">
              <section className="panel">
                <div className="panel-heading">
                  <h2>Justificativas e revisões</h2>
                </div>
                {d.justificativas.map((j) => (
                  <div className="text-record" key={j.id}>
                    <Badge value={j.status} />
                    <p>{j.texto}</p>
                    {j.comentario_revisor && (
                      <small>Revisor: {j.comentario_revisor}</small>
                    )}
                  </div>
                ))}
                {!d.justificativas.length && <Empty />}
                <div className="panel-heading">
                  <h2>Cobranças simuladas</h2>
                </div>
                {d.cobrancas.map((c) => (
                  <div className="text-record" key={c.id}>
                    <small>{date(c.data_envio)} · Caixa interna</small>
                    <p>{c.mensagem}</p>
                  </div>
                ))}
                {!d.cobrancas.length && <Empty />}
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <h2>Linha do tempo</h2>
                </div>
                <div className="timeline">
                  {d.historico.map((event) => (
                    <div key={event.id}>
                      <span className="timeline-dot" />
                      <b>{label(event.acao)}</b>
                      <small>{date(event.timestamp)}</small>
                      {event.valor_novo && <p>{event.valor_novo}</p>}
                    </div>
                  ))}
                </div>
              </section>
            </div>
            {issue && (
              <JustifyModal
                issue={issue}
                notify={notify}
                onClose={() => setIssue(null)}
              />
            )}
            {closeId && (
              <Modal
                title="Encerrar pendência"
                onClose={() => setCloseId(null)}
              >
                <p>
                  Confirma o encerramento da pendência #{closeId}? O backend
                  verificará os critérios e a justificativa exigida.
                </p>
                <div className="modal-actions">
                  <button onClick={() => setCloseId(null)}>Cancelar</button>
                  <button className="button" disabled={saving} onClick={close}>
                    Confirmar encerramento
                  </button>
                </div>
              </Modal>
            )}
            {edit && (
              <Modal
                title="Corrigir informações"
                onClose={() => setEdit(false)}
              >
                <form onSubmit={correct}>
                  <label>
                    Projeto
                    <select name="projeto_id" defaultValue={d.projeto_id || ""}>
                      <option value="">Não classificado</option>
                      {projects.data?.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Responsável
                    <select
                      name="responsavel_id"
                      defaultValue={d.responsavel_id || ""}
                    >
                      <option value="">Não atribuído</option>
                      {users.data?.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome}
                        </option>
                      ))}
                    </select>
                  </label>
                  {["data_emissao", "data_recebimento", "data_vencimento"].map(
                    (field) => (
                      <label key={field}>
                        {label(field)}
                        <input
                          required
                          type="date"
                          name={field}
                          defaultValue={d[field as "data_emissao"]}
                        />
                      </label>
                    ),
                  )}
                  <div className="modal-actions">
                    <button type="button" onClick={() => setEdit(false)}>
                      Cancelar
                    </button>
                    <button className="button" disabled={saving}>
                      Salvar correções
                    </button>
                  </div>
                </form>
              </Modal>
            )}
          </>
        )
      )}
    </>
  );
}
