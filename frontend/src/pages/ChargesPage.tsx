import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Send } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api, date, label } from "../api";
import type { Notify } from "../App";
import {
  Badge,
  Empty,
  ErrorState,
  Heading,
  Loading,
  Modal,
  Pager,
} from "../components";
import type { Charge, Issue, Page } from "../types";

export function ChargesPage({ notify }: { notify: Notify }) {
  const [selected, setSelected] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<
    { pendencia_id: number; destinatario: string; mensagem: string }[] | null
  >(null);
  const [saving, setSaving] = useState(false);
  const client = useQueryClient();
  const issues = useQuery({
    queryKey: ["elegiveis", page],
    queryFn: () =>
      api<Page<Issue>>(`/pendencias?elegiveis=true&pagina=${page}`),
  });
  const history = useQuery({
    queryKey: ["cobrancas"],
    queryFn: () => api<Page<Charge>>("/cobrancas?tamanho=100"),
  });
  const generate = async () => {
    setSaving(true);
    try {
      setPreview(
        await api("/cobrancas/previa", {
          method: "POST",
          body: JSON.stringify({ pendencia_ids: selected }),
        }),
      );
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  };
  const send = async () => {
    setSaving(true);
    try {
      const result = await api<{
        enviadas: number[];
        ignoradas_ja_enviadas_hoje: number[];
      }>("/cobrancas", {
        method: "POST",
        body: JSON.stringify({ pendencia_ids: selected }),
      });
      await client.invalidateQueries();
      notify(
        `${result.enviadas.length} cobrança(s) simulada(s). ${result.ignoradas_ja_enviadas_hoje.length} já enviada(s) hoje.`,
      );
      setPreview(null);
      setSelected([]);
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <Heading
        eyebrow="NOTIFICAÇÕES"
        title="Central de cobranças"
        description="Lembretes oportunos para manter o trabalho em movimento."
      />
      <div className="info-note">
        <Bell size={18} />
        As mensagens ficam na caixa de saída interna. Nenhum email é enviado.
        Uma cobrança por pendência por dia.
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Pendências elegíveis</h2>
            <p>Prazo próximo ou vencido, com responsável e fora de revisão</p>
          </div>
          <button
            className="button"
            disabled={!selected.length || saving}
            onClick={generate}
          >
            <Send size={15} />
            Gerar prévia ({selected.length})
          </button>
        </div>
        {issues.isLoading ? (
          <Loading />
        ) : issues.error ? (
          <ErrorState error={issues.error} />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Selecionar</th>
                    <th>Pendência</th>
                    <th>Documento</th>
                    <th>Prazo</th>
                    <th>Severidade</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.data?.items.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Selecionar pendência ${p.id}`}
                          checked={selected.includes(p.id)}
                          onChange={(e) =>
                            setSelected(
                              e.target.checked
                                ? [...selected, p.id]
                                : selected.filter((x) => x !== p.id),
                            )
                          }
                        />
                      </td>
                      <td>
                        #{p.id} · {label(p.tipo)}
                      </td>
                      <td>
                        <Link to={`/documentos/${p.documento_id}`}>
                          {p.documento}
                        </Link>
                      </td>
                      <td>{date(p.prazo_resolucao)}</td>
                      <td>
                        <Badge value={p.severidade} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!issues.data?.total && <Empty />}
            <Pager
              page={page}
              total={issues.data?.total || 0}
              onChange={(value) => {
                setPage(value);
                setSelected([]);
              }}
            />
          </>
        )}
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Caixa de saída</h2>
            <p>Últimas 100 notificações registradas</p>
          </div>
          <Badge value="simulada" />
        </div>
        {history.isLoading ? (
          <Loading />
        ) : history.error ? (
          <ErrorState error={history.error} />
        ) : history.data?.items.length ? (
          <div className="outbox">
            {history.data.items.map((c) => (
              <article key={c.id}>
                <div className="outbox-icon">
                  <Send size={16} />
                </div>
                <div>
                  <b>
                    Pendência #{c.pendencia_id}{" "}
                    <span className="muted">· {date(c.data_envio)}</span>
                  </b>
                  <p>{c.mensagem}</p>
                </div>
                <Badge value={c.status} />
              </article>
            ))}
          </div>
        ) : (
          <Empty />
        )}
      </section>
      {preview && (
        <Modal
          title="Prévia das cobranças simuladas"
          onClose={() => setPreview(null)}
        >
          {preview.map((x) => (
            <div className="text-record" key={x.pendencia_id}>
              <b>Para: {x.destinatario}</b>
              <p>{x.mensagem}</p>
            </div>
          ))}
          <div className="modal-actions">
            <button onClick={() => setPreview(null)}>Cancelar</button>
            <button className="button" disabled={saving} onClick={send}>
              Registrar envio simulado
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
