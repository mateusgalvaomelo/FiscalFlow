import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileText, Search } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, brl, date, label } from "../api";
import {
  Badge,
  Empty,
  ErrorState,
  Heading,
  Loading,
  Pager,
} from "../components";
import type { Document, Page } from "../types";

export function DocumentsPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("data_recebimento");
  const query = useQuery({
    queryKey: [
      "documentos",
      search,
      status,
      page,
      sort,
      searchParams.toString(),
    ],
    queryFn: () =>
      api<Page<Document>>(
        `/documentos?${new URLSearchParams({ busca: search, status, ...Object.fromEntries(searchParams), pagina: String(page), ordenar: sort }).toString().replace("status=&", "")}`,
      ),
  });
  return (
    <>
      <Heading
        eyebrow="OPERAÇÃO"
        title="Recebimento fiscal"
        description="Um ponto de encontro para todos os seus documentos."
      />
      <section className="panel">
        <div className="table-toolbar">
          <div className="searchbox">
            <Search size={17} />
            <input
              aria-label="Buscar documentos"
              placeholder="Buscar documento ou fornecedor…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            aria-label="Status do documento"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos os status</option>
            {["regular", "pendente", "inconsistente"].map((x) => (
              <option key={x} value={x}>
                {label(x)}
              </option>
            ))}
          </select>
          <select
            aria-label="Ordenar documentos"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            <option value="data_recebimento">Mais recentes</option>
            <option value="valor">Maior valor</option>
            <option value="numero_documento">Número</option>
          </select>
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
                      "Documento / Fornecedor",
                      "Projeto",
                      "Emissão",
                      "Recebimento",
                      "Valor",
                      "Status",
                      "Responsável",
                      "Pendências",
                      "",
                    ].map((x, i) => (
                      <th key={i}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {query.data?.items.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <Link
                          className="document-link"
                          to={`/documentos/${d.id}`}
                        >
                          <FileText size={15} />
                          {d.numero_documento}
                        </Link>
                        <small>{d.fornecedor}</small>
                      </td>
                      <td>{d.projeto}</td>
                      <td>{date(d.data_emissao)}</td>
                      <td>{date(d.data_recebimento)}</td>
                      <td className="money">{brl(d.valor)}</td>
                      <td>
                        <Badge value={d.status} />
                      </td>
                      <td>{d.responsavel.split(" · ")[1] || d.responsavel}</td>
                      <td>
                        <span
                          className={d.pendencias ? "issue-count" : "muted"}
                        >
                          {d.pendencias}
                        </span>
                      </td>
                      <td>
                        <Link
                          aria-label={`Abrir ${d.numero_documento}`}
                          to={`/documentos/${d.id}`}
                        >
                          <ArrowRight size={16} />
                        </Link>
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
    </>
  );
}
