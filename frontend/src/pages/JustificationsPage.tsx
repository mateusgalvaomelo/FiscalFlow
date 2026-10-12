import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check } from "lucide-react";
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
import type { Justification, Page } from "../types";

export function JustificationsPage({
  notify,
  profile,
}: {
  notify: Notify;
  profile: string;
}) {
  const [status, setStatus] = useState("em_revisao");
  const [page, setPage] = useState(1);
  const [review, setReview] = useState<Justification | null>(null);
  const [decision, setDecision] = useState("aprovada");
  const [saving, setSaving] = useState(false);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["justificativas", status, page],
    queryFn: () =>
      api<Page<Justification>>(
        `/justificativas?${new URLSearchParams({ ...(status ? { status } : {}), pagina: String(page) })}`,
      ),
  });
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await api(`/justificativas/${review!.id}/revisar`, {
        method: "POST",
        body: JSON.stringify({
          decisao: decision,
          comentario: form.get("comentario"),
        }),
      });
      await client.invalidateQueries();
      notify(
        decision === "aprovada"
          ? "Justificativa aprovada e pendência encerrada."
          : "Justificativa devolvida para complementação.",
      );
      setReview(null);
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <Heading
        eyebrow="ANÁLISE E REVISÃO"
        title="Justificativas"
        description="Uma decisão clara, com contexto e rastreabilidade."
        action={
          <Link className="button secondary" to="/pendencias">
            Registrar justificativa <ArrowRight size={15} />
          </Link>
        }
      />
      <div className="tabs">
        {["em_revisao", "aprovada", "devolvida", ""].map((x) => (
          <button
            key={x}
            className={status === x ? "selected" : ""}
            onClick={() => {
              setStatus(x);
              setPage(1);
            }}
          >
            {x ? label(x) : "Todas"}
          </button>
        ))}
      </div>
      {!["administrador", "revisor"].includes(profile) && (
        <div className="info-note">
          Para revisar, selecione um perfil revisor ou administrador no
          cabeçalho.
        </div>
      )}
      <section className="panel">
        {query.isLoading ? (
          <Loading />
        ) : query.error ? (
          <ErrorState error={query.error} />
        ) : (
          <>
            <div className="justification-list">
              {query.data?.items.map((j) => (
                <article key={j.id}>
                  <div>
                    <span className="eyebrow">
                      JUSTIFICATIVA #{j.id} · PENDÊNCIA #{j.pendencia_id}
                    </span>
                    <Badge value={j.status} />
                  </div>
                  <p>{j.texto}</p>
                  <small>
                    Enviada em {date(j.data_envio)}
                    {j.comentario_revisor &&
                      ` · Revisão: ${j.comentario_revisor}`}
                  </small>
                  {j.status === "em_revisao" && (
                    <button
                      className="button secondary"
                      disabled={!["administrador", "revisor"].includes(profile)}
                      onClick={() => setReview(j)}
                    >
                      <Check size={15} />
                      Revisar
                    </button>
                  )}
                </article>
              ))}
            </div>
            {!query.data?.total && <Empty />}
            <Pager
              page={page}
              total={query.data?.total || 0}
              onChange={setPage}
            />
          </>
        )}
      </section>
      {review && (
        <Modal
          title={`Revisar justificativa #${review.id}`}
          onClose={() => setReview(null)}
        >
          <p>{review.texto}</p>
          <form onSubmit={submit}>
            <label>
              Decisão
              <select
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
              >
                <option value="aprovada">Aprovar e encerrar pendência</option>
                <option value="devolvida">Solicitar complementação</option>
              </select>
            </label>
            <label>
              Comentário do revisor
              <textarea
                name="comentario"
                required
                minLength={5}
                maxLength={2000}
                rows={4}
              />
            </label>
            <p className="form-hint">
              Antes de aprovar, os dados necessários precisam estar corrigidos
              no documento. A API impede encerramentos incompatíveis.
            </p>
            <div className="modal-actions">
              <button type="button" onClick={() => setReview(null)}>
                Cancelar
              </button>
              <button className="button" disabled={saving}>
                Confirmar revisão
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
