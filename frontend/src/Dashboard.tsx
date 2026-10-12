import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownToLine,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileText,
  SlidersHorizontal,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { api, brl, label, number } from "./api";
import type { Dashboard, Project, Supplier } from "./types";
import { Empty, ErrorState, Heading, Loading } from "./components";

const COLORS = ["#257a68", "#dca84d", "#dd795d", "#638cbd"];
const statusColor = (status: string) =>
  ({ regular: COLORS[0], pendente: COLORS[1], inconsistente: COLORS[2] })[
    status
  ] || COLORS[3];
export function DashboardPage() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState(false);
  const params = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v),
  );
  const query = useQuery({
    queryKey: ["dashboard", params.toString()],
    queryFn: () => api<Dashboard>(`/dashboard?${params}`),
  });
  const projects = useQuery({
    queryKey: ["projetos"],
    queryFn: () => api<Project[]>("/projetos"),
  });
  const suppliers = useQuery({
    queryKey: ["fornecedores"],
    queryFn: () => api<Supplier[]>("/fornecedores"),
  });
  const set = (key: string, value: string) =>
    setFilters({ ...filters, [key]: value });
  const data = query.data;
  const k = data?.kpis;
  return (
    <>
      <Heading
        eyebrow="PAINEL EXECUTIVO"
        title="Tudo em fluxo. Tudo sob controle."
        description="Acompanhe seus recebimentos e transforme pendências em decisões."
        action={
          <a className="button secondary" href="/api/dataset">
            <ArrowDownToLine size={16} />
            Baixar dataset
          </a>
        }
      />
      <div className="filterbar">
        <div>
          <span className="status-dot" />
          <strong>Visão consolidada</strong>
          <span className="muted"> · Atlas Operações</span>
        </div>
        <div className="filter-controls">
          <select
            aria-label="Filtrar projeto"
            value={filters.projeto_id || ""}
            onChange={(e) => set("projeto_id", e.target.value)}
          >
            <option value="">Todos os projetos</option>
            {projects.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <button
            className={expanded ? "active-filter" : ""}
            onClick={() => setExpanded(!expanded)}
          >
            <SlidersHorizontal size={15} />
            Filtros
          </button>
        </div>
      </div>
      {expanded && (
        <div className="filter-panel">
          <label>
            De
            <input
              type="date"
              value={filters.inicio || ""}
              onChange={(e) => set("inicio", e.target.value)}
            />
          </label>
          <label>
            Até
            <input
              type="date"
              value={filters.fim || ""}
              onChange={(e) => set("fim", e.target.value)}
            />
          </label>
          <label>
            Área
            <select
              value={filters.area || ""}
              onChange={(e) => set("area", e.target.value)}
            >
              <option value="">Todas</option>
              {[
                "Operações",
                "Tecnologia",
                "Engenharia",
                "Suprimentos",
                "Administrativo",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Fornecedor
            <select
              value={filters.fornecedor_id || ""}
              onChange={(e) => set("fornecedor_id", e.target.value)}
            >
              <option value="">Todos</option>
              {suppliers.data?.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.razao_social}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={filters.status || ""}
              onChange={(e) => set("status", e.target.value)}
            >
              <option value="">Todos</option>
              {["regular", "pendente", "inconsistente"].map((x) => (
                <option value={x} key={x}>
                  {label(x)}
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => setFilters({})}>Limpar</button>
        </div>
      )}
      {query.isLoading ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : (
        data &&
        k && (
          <>
            <div className="kpi-grid">
              {[
                {
                  name: "Documentos recebidos",
                  value: number(k.documentos_recebidos),
                  icon: FileText,
                  sub: "No período selecionado",
                  color: "teal",
                },
                {
                  name: "Volume financeiro",
                  value: brl(k.valor_total),
                  icon: Wallet,
                  sub: "Valor total dos recebimentos",
                  color: "blue",
                },
                {
                  name: "Taxa de regularização",
                  value: `${number(k.taxa_regularizacao)}%`,
                  icon: CheckCircle2,
                  sub: `${number(k.documentos_regulares)} documentos regulares`,
                  color: "green",
                },
                {
                  name: "Pendências vencidas",
                  value: number(k.pendencias_vencidas),
                  icon: Clock3,
                  sub: "Precisam da sua atenção",
                  color: "amber",
                },
              ].map((item) => (
                <div className={`kpi ${item.color}`} key={item.name}>
                  <div className="kpi-title">
                    {item.name}
                    <span className="kpi-icon">
                      <item.icon size={18} />
                    </span>
                  </div>
                  <strong>{item.value}</strong>
                  <small>{item.sub}</small>
                </div>
              ))}
            </div>
            <div className="overview-strip">
              <span>
                <span className="status-dot" />{" "}
                <b>{number(k.documentos_regulares)}</b> regulares
              </span>
              <span>
                <span className="status-dot amber" />{" "}
                <b>{number(k.documentos_pendentes)}</b> pendentes
              </span>
              <span>
                <span className="status-dot red" />{" "}
                <b>{number(k.documentos_inconsistentes)}</b> com inconsistências
              </span>
              <span>
                <Clock3 size={14} />{" "}
                <b>{number(k.tempo_medio_resolucao)} dias</b> para resolver, em
                média
              </span>
            </div>
            {!k.documentos_recebidos ? (
              <Empty />
            ) : (
              <>
                <div className="chart-grid">
                  <section className="panel main-chart">
                    <div className="panel-heading">
                      <div>
                        <h2>Evolução dos recebimentos</h2>
                        <p>Volume de documentos recebidos ao longo dos meses</p>
                      </div>
                      <span className="chart-legend">
                        <span className="status-dot" />
                        Recebimentos
                      </span>
                    </div>
                    <div className="chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={data.mensal}
                          margin={{ left: -20, right: 15, top: 15 }}
                        >
                          <defs>
                            <linearGradient
                              id="area"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#2c8b77"
                                stopOpacity={0.25}
                              />
                              <stop
                                offset="100%"
                                stopColor="#2c8b77"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            vertical={false}
                            strokeDasharray="3 5"
                          />
                          <XAxis
                            dataKey="mes"
                            tickFormatter={(v) =>
                              `${v.slice(5)}/${v.slice(2, 4)}`
                            }
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis tickLine={false} axisLine={false} />
                          <Tooltip />
                          <Area
                            isAnimationActive={false}
                            type="monotone"
                            dataKey="documentos"
                            name="Documentos"
                            stroke="#267c68"
                            fill="url(#area)"
                            strokeWidth={3}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </section>
                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <h2>Saúde dos documentos</h2>
                        <p>Distribuição por status</p>
                      </div>
                    </div>
                    <div className="donut">
                      <ResponsiveContainer width="100%" height={185}>
                        <PieChart>
                          <Pie
                            isAnimationActive={false}
                            data={data.status}
                            dataKey="quantidade"
                            nameKey="nome"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={4}
                          >
                            {data.status.map((x) => (
                              <Cell key={x.nome} fill={statusColor(x.nome)} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(v, n) => [v, label(String(n))]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="donut-label">
                        <b>{number(k.documentos_recebidos)}</b>
                        <small>documentos</small>
                      </div>
                    </div>
                    <div className="donut-legend">
                      {data.status.map((x) => (
                        <div key={x.nome}>
                          <span>
                            <i style={{ background: statusColor(x.nome) }} />
                            {label(x.nome)}
                          </span>
                          <b>{number(x.quantidade)}</b>
                          <small>
                            {number(
                              Math.round(
                                (x.quantidade / k.documentos_recebidos) * 100,
                              ),
                            )}
                            %
                          </small>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
                <div className="chart-grid lower">
                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <h2>Onde estão as pendências?</h2>
                        <p>Pendências ativas por categoria</p>
                      </div>
                      <CircleAlert size={19} />
                    </div>
                    <div className="category-bars">
                      {data.categorias.map((x, i) => (
                        <div key={x.nome}>
                          <div>
                            <span>{label(x.nome)}</span>
                            <b>{x.quantidade}</b>
                          </div>
                          <div className="bar-track">
                            <span
                              style={{
                                width: `${(x.quantidade / Math.max(...data.categorias.map((c) => c.quantidade), 1)) * 100}%`,
                                background: COLORS[i % 4],
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                  <section className="panel attention">
                    <div className="attention-icon">
                      <Clock3 size={24} />
                    </div>
                    <span className="eyebrow">PRÓXIMO PASSO</span>
                    <h2>
                      Uma fila mais leve
                      <br />
                      começa com uma ação.
                    </h2>
                    <p>
                      Há {number(k.pendencias_abertas)} pendências abertas.
                      Priorize os prazos vencidos e acompanhe a regularização.
                    </p>
                    <Link className="button" to="/pendencias?status=vencida">
                      Tratar pendências <ArrowRight size={16} />
                    </Link>
                  </section>
                </div>
                <div className="three-charts">
                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <h2>Severidade</h2>
                        <p>Pendências ativas</p>
                      </div>
                    </div>
                    <div className="mini-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={data.severidades.map((x) => ({
                            ...x,
                            nome: label(x.nome),
                          }))}
                        >
                          <XAxis
                            dataKey="nome"
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip />
                          <Bar
                            isAnimationActive={false}
                            dataKey="quantidade"
                            fill="#d5a152"
                            radius={[5, 5, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </section>
                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <h2>Regularização mensal</h2>
                        <p>Percentual regular por mês de recebimento</p>
                      </div>
                      <TrendingUp size={18} />
                    </div>
                    <div className="mini-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.mensal}>
                          <XAxis
                            dataKey="mes"
                            tickFormatter={(v) => v.slice(5)}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis domain={[0, 100]} width={30} />
                          <Tooltip />
                          <Line
                            isAnimationActive={false}
                            dataKey="taxa"
                            name="Regularização (%)"
                            stroke="#267c68"
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </section>
                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <h2>Áreas em foco</h2>
                        <p>Ranking de pendências ativas</p>
                      </div>
                    </div>
                    <div className="ranking">
                      {[...data.areas]
                        .sort((a, b) => b.quantidade - a.quantidade)
                        .map((x, i) => (
                          <div key={x.nome}>
                            <span>
                              <small>{String(i + 1).padStart(2, "0")}</small>
                              {x.nome}
                            </span>
                            <b>{x.quantidade}</b>
                          </div>
                        ))}
                    </div>
                  </section>
                </div>
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Volume financeiro por projeto</h2>
                      <p>Os oito maiores volumes no período</p>
                    </div>
                  </div>
                  <div className="project-values">
                    {data.projetos.map((x) => (
                      <div key={x.nome}>
                        <span>{x.nome}</span>
                        <b>{brl(x.valor)}</b>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </>
        )
      )}
    </>
  );
}
