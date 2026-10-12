import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api, brl } from "../api";
import { ErrorState, Heading, Loading } from "../components";
import type { Project, Supplier } from "../types";

export function ProjectsPage() {
  const [tab, setTab] = useState("projetos");
  const [search, setSearch] = useState("");
  const projects = useQuery({
    queryKey: ["projetos"],
    queryFn: () => api<Project[]>("/projetos"),
  });
  const suppliers = useQuery({
    queryKey: ["fornecedores"],
    queryFn: () => api<Supplier[]>("/fornecedores"),
  });
  return (
    <>
      <Heading
        eyebrow="CADASTROS E CONTEXTO"
        title="Projetos e fornecedores"
        description="Conecte cada recebimento ao contexto certo."
      />
      <div className="tabs">
        <button
          className={tab === "projetos" ? "selected" : ""}
          onClick={() => setTab("projetos")}
        >
          Projetos ({projects.data?.length || 0})
        </button>
        <button
          className={tab === "fornecedores" ? "selected" : ""}
          onClick={() => setTab("fornecedores")}
        >
          Fornecedores ({suppliers.data?.length || 0})
        </button>
      </div>
      <div className="table-toolbar">
        <div className="searchbox">
          <Search size={17} />
          <input
            aria-label="Buscar cadastros"
            placeholder="Buscar por nome, código ou área…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      {tab === "projetos" ? (
        projects.isLoading ? (
          <Loading />
        ) : projects.error ? (
          <ErrorState error={projects.error} />
        ) : (
          <div className="project-grid">
            {projects.data
              ?.filter((p) =>
                `${p.nome} ${p.codigo} ${p.area}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((p) => (
                <article className="panel project-card" key={p.id}>
                  <div className="project-icon">
                    <Building2 size={21} />
                  </div>
                  <span className="eyebrow">
                    {p.codigo} · {p.area}
                  </span>
                  <h2>{p.nome}</h2>
                  <small>{p.centro_custo}</small>
                  <div className="project-numbers">
                    <div>
                      <b>{p.documentos}</b>
                      <small>documentos</small>
                    </div>
                    <div>
                      <b>{p.pendentes}</b>
                      <small>com pendências</small>
                    </div>
                  </div>
                  <div className="project-card-footer">
                    <strong>{brl(p.valor_total)}</strong>
                    <Link to={`/documentos?projeto_id=${p.id}`}>
                      Explorar <ArrowRight size={14} />
                    </Link>
                  </div>
                </article>
              ))}
          </div>
        )
      ) : (
        <section className="panel">
          {suppliers.isLoading ? (
            <Loading />
          ) : suppliers.error ? (
            <ErrorState error={suppliers.error} />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {[
                      "Fornecedor",
                      "Identificador fictício",
                      "Categoria",
                      "Contato",
                      "Documentos",
                    ].map((x) => (
                      <th key={x}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {suppliers.data
                    ?.filter((s) =>
                      s.razao_social
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    )
                    .map((s) => (
                      <tr key={s.id}>
                        <td>{s.razao_social}</td>
                        <td>{s.identificador_ficticio}</td>
                        <td>{s.categoria}</td>
                        <td>{s.email}</td>
                        <td>
                          <Link to={`/documentos?fornecedor_id=${s.id}`}>
                            Explorar <ArrowRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  );
}
