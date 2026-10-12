import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  Bell,
  Building2,
  ChevronDown,
  CircleHelp,
  FileInput,
  Files,
  LayoutDashboard,
  ListTodo,
  Menu,
  MessageSquareText,
  Moon,
  Settings2,
  ShieldCheck,
  Sun,
  X,
} from "lucide-react";
import { api } from "./api";
import type { User } from "./types";
import { DashboardPage } from "./Dashboard";
import {
  DocumentsPage,
  DetailPage,
  IssuesPage,
  JustificationsPage,
} from "./pages/operations";
import {
  AboutPage,
  ChargesPage,
  ImportsPage,
  ProjectsPage,
  SettingsPage,
} from "./pages/workspace";

const navigation = [
  { path: "/", label: "Visão geral", icon: LayoutDashboard },
  { path: "/documentos", label: "Recebimento fiscal", icon: Files },
  { path: "/pendencias", label: "Pendências", icon: ListTodo },
  { path: "/justificativas", label: "Justificativas", icon: MessageSquareText },
  { path: "/cobrancas", label: "Central de cobranças", icon: Bell },
  { path: "/importacoes", label: "Importação de dados", icon: FileInput },
  { path: "/projetos", label: "Projetos e fornecedores", icon: Building2 },
];
export type Notify = (message: string, error?: boolean) => void;

export default function App() {
  const [user, setUser] = useState(localStorage.getItem("demo-user") || "1");
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [mobile, setMobile] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  const users = useQuery({
    queryKey: ["usuarios"],
    queryFn: () => api<User[]>("/usuarios"),
  });
  const location = useLocation();
  const current = navigation.find((x) =>
    x.path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(x.path),
  );
  const selected = users.data?.find((x) => x.id === Number(user));
  const notify: Notify = (message, error = false) => {
    setToast({ message, error });
    window.setTimeout(() => setToast(null), 6000);
  };
  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
  };
  return (
    <div className="app" data-theme={theme}>
      <aside className={`sidebar ${mobile ? "visible" : ""}`}>
        <Link to="/" className="brand">
          <span className="brand-icon">
            <Activity size={24} />
          </span>
          <span>
            Fiscal<span className="brand-light">Flow</span>
            <small>RECEBIMENTO INTELIGENTE</small>
          </span>
        </Link>
        <div className="workspace-switch">
          <span className="company-avatar">A</span>
          <div>
            <strong>Atlas Operações</strong>
            <small>Ambiente demonstrativo</small>
          </div>
          <ChevronDown size={16} />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              onClick={() => setMobile(false)}
            >
              <item.icon size={19} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <nav>
            <NavLink to="/configuracoes">
              <Settings2 size={19} />
              Configurações
            </NavLink>
            <NavLink to="/sobre">
              <CircleHelp size={19} />
              Sobre o projeto
            </NavLink>
          </nav>
          <div className="demo-note">
            <ShieldCheck size={18} />
            <div>
              <strong>Explore com tranquilidade</strong>
              <p>
                Todos os dados são fictícios.
                <br />
                Nenhum envio de email real.
              </p>
              <Link to="/sobre">
                Conheça a demonstração <ArrowUpRight size={13} />
              </Link>
            </div>
          </div>
          <small className="version">FiscalFlow · Open source · v1.0</small>
        </div>
      </aside>
      {mobile && (
        <button
          className="sidebar-shade"
          aria-label="Fechar menu"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="mobile-menu"
              aria-label="Abrir menu"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <span>/</span>
            <strong>
              {current?.label ||
                (location.pathname === "/configuracoes"
                  ? "Configurações"
                  : "Sobre o projeto")}
            </strong>
          </div>
          <div className="top-actions">
            <span className="demo-pill">
              <span />
              Demonstração local
            </span>
            <button aria-label="Alternar tema" onClick={toggleTheme}>
              {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
            </button>
            <div className="profile">
              <span className="avatar">
                {selected?.nome.split(" · ")[1]?.slice(0, 2).toUpperCase() ||
                  "AD"}
              </span>
              <label className="sr-only" htmlFor="profile">
                Perfil demonstrativo
              </label>
              <select
                id="profile"
                value={user}
                onChange={(e) => {
                  setUser(e.target.value);
                  localStorage.setItem("demo-user", e.target.value);
                  notify(
                    "Perfil demonstrativo alterado. Não há autenticação real.",
                  );
                }}
              >
                {users.data?.slice(0, 8).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.perfil} · {u.nome.split(" · ")[1]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/documentos" element={<DocumentsPage />} />
            <Route
              path="/documentos/:id"
              element={<DetailPage notify={notify} />}
            />
            <Route
              path="/pendencias"
              element={<IssuesPage notify={notify} />}
            />
            <Route
              path="/justificativas"
              element={
                <JustificationsPage
                  notify={notify}
                  profile={selected?.perfil || ""}
                />
              }
            />
            <Route
              path="/cobrancas"
              element={<ChargesPage notify={notify} />}
            />
            <Route
              path="/importacoes"
              element={<ImportsPage notify={notify} />}
            />
            <Route path="/projetos" element={<ProjectsPage />} />
            <Route
              path="/configuracoes"
              element={
                <SettingsPage
                  notify={notify}
                  profile={selected?.perfil || ""}
                  toggleTheme={toggleTheme}
                />
              }
            />
            <Route path="/sobre" element={<AboutPage />} />
            <Route
              path="*"
              element={
                <div className="empty">
                  Página não encontrada. <Link to="/">Voltar ao início</Link>
                </div>
              }
            />
          </Routes>
        </main>
        <footer>
          <span>
            Atlas Operações <span className="muted">/</span> Dados
            exclusivamente sintéticos
          </span>
          <span>
            <span className="status-dot" /> API e persistência locais
          </span>
        </footer>
      </div>
      {toast && (
        <div
          className={`toast ${toast.error ? "error" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          {toast.message}
          <button aria-label="Fechar mensagem" onClick={() => setToast(null)}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
