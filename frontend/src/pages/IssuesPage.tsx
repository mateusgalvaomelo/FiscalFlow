import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
import type { Issue, Page, User } from "../types";

import { JustifyModal } from "../JustifyModal";
export function IssuesPage({ notify }: { notify: Notify }) {
  const [params] = useSearchParams();
  const [status, setStatus] = useState(params.get("status") || "aberta");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [issue, setIssue] = useState<Issue | null>(null);
  const [assign, setAssign] = useState<Issue | null>(null);
  const [saving, setSaving] = useState(false);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["pendencias", status, search, page],
    queryFn: () =>
      api<Page<Issue>>(
        `/pendencias?${new URLSearchParams({ ...(status ? { status } : {}), busca: search, pagina: String(page) })}`,
      ),
  });
  const users = useQuery({
    queryKey: ["usuarios"],
    queryFn: () => api<User[]>("/usuarios"),
  });
  const assignUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/pendencias/${assign!.id}/responsavel`, {
        method: "PATCH",
        body: JSON.stringify({
          responsavel_id: Number(
            new FormData(e.currentTarget).get("responsavel_id"),
          ),
        }),
      });
      await client.invalidateQueries();
      notify("Responsável atribuído à pendência.");
      setAssign(null);
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <Heading
        eyebrow="FILA OPERACIONAL"
        title="Cada pendência, um próximo passo."
        description="Organize as prioridades e acompanhe cada resolução."
      />
      <div className="tabs">
        {[
          "aberta",
          "em_tratamento",
          "vencida",
          "aguardando_revisao",
          "encerrada",
          "",
        ].map((x) => (
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
      <section className="panel">
        <div className="table-toolbar">
          <div className="searchbox">
            <Search size={17} />
            <input
              placeholder="Buscar documento ou descrição…"
              aria-label="Buscar pendências"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        {query.isLoading ? (
          <Loading />
        ) : query.error ? (
          <ErrorState error={query.error} />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {[
                      "Pendência",
                      "Documento",
                      "Severidade",
                      "Prazo",
                      "Status",
                      "Ações",
                    ].map((x) => (
                      <th key={x}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {query.data?.items.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <b>
                          #{p.id} · {label(p.tipo)}
                        </b>
                        <small>{p.descricao}</small>
                      </td>
                      <td>
                        <Link to={`/documentos/${p.documento_id}`}>
                          {p.documento}
                        </Link>
                      </td>
                      <td>
                        <Badge value={p.severidade} />
                      </td>
                      <td className={p.vencida ? "overdue" : ""}>
                        {date(p.prazo_resolucao)}
                      </td>
                      <td>
                        <Badge value={p.status} />
                      </td>
                      <td>
                        <div className="row-actions">
                          {p.status !== "encerrada" && (
                            <button onClick={() => setAssign(p)}>
                              Atribuir
                            </button>
                          )}
                          {["aberta", "em_tratamento"].includes(p.status) && (
                            <button onClick={() => setIssue(p)}>
                              Justificar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
      {issue && (
        <JustifyModal
          issue={issue}
          notify={notify}
          onClose={() => setIssue(null)}
        />
      )}
      {assign && (
        <Modal
          title={`Atribuir pendência #${assign.id}`}
          onClose={() => setAssign(null)}
        >
          <form onSubmit={assignUser}>
            <label>
              Responsável
              <select
                name="responsavel_id"
                defaultValue={assign.responsavel_id || users.data?.[0]?.id}
              >
                {users.data?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome} · {u.area}
                  </option>
                ))}
              </select>
            </label>
            <p className="form-hint">
              A atribuição da pendência é independente da atribuição do
              documento. Corrija o documento nos detalhes quando necessário.
            </p>
            <div className="modal-actions">
              <button className="button" disabled={saving}>
                Salvar atribuição
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
