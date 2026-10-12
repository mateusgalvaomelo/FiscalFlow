import { ArrowDownToLine, ArrowRight, Database, Github } from "lucide-react";
import { Heading } from "../components";

export function AboutPage() {
  const repository = import.meta.env.VITE_REPOSITORY_URL as string | undefined;
  return (
    <>
      <Heading
        eyebrow="OPEN SOURCE · DADOS FICTÍCIOS"
        title="Menos dispersão. Mais fluxo."
        description="FiscalFlow: um laboratório de produto, engenharia e gestão de recebimento fiscal."
      />
      <section className="panel about-hero">
        <span className="brand-icon">
          <Database size={28} />
        </span>
        <h2>
          Do recebimento à decisão,
          <br />
          com contexto em cada etapa.
        </h2>
        <p>
          A Atlas Operações é uma empresa fictícia. O FiscalFlow centraliza
          documentos, identifica inconsistências e organiza o trabalho de
          responsáveis e revisores em um fluxo rastreável.
        </p>
        <div>
          <a
            className="button"
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
          >
            Explorar API <ArrowRight size={16} />
          </a>
          {repository && (
            <a
              className="button secondary"
              href={repository}
              target="_blank"
              rel="noreferrer"
            >
              <Github size={16} />
              Repositório GitHub
            </a>
          )}
        </div>
      </section>
      <div className="three-charts">
        {[
          {
            title: "Frontend",
            description:
              "React + TypeScript, Vite, Tailwind, Recharts e TanStack Query. Formulários com React Hook Form e Zod.",
          },
          {
            title: "Backend",
            description:
              "FastAPI, Pydantic, SQLAlchemy e Alembic. Regras desacopladas, transações e autorização demonstrativa.",
          },
          {
            title: "Dados e execução",
            description:
              "PostgreSQL no Docker; SQLite como alternativa local. ETL com Pandas e OpenPyXL. Dataset gerado com Faker e NumPy.",
          },
        ].map((x) => (
          <section className="panel preference" key={x.title}>
            <h2>{x.title}</h2>
            <p>{x.description}</p>
          </section>
        ))}
      </div>
      <section className="panel preference">
        <h2>O fluxo de trabalho</h2>
        <div className="flow">
          {[
            "Recebimento",
            "Validação",
            "Pendência",
            "Justificativa",
            "Revisão",
            "Regularização",
          ].map((x, i) => (
            <span key={x}>
              {x}
              {i < 5 && <ArrowRight size={15} />}
            </span>
          ))}
        </div>
        <p>
          O motor verifica projeto, responsável, datas e possíveis duplicidades.
          Cada categoria define prazo, severidade e necessidade de
          justificativa. O encerramento só ocorre após satisfazer os critérios,
          e ações relevantes ficam no histórico.
        </p>
        <div className="info-note">
          Simulador administrativo. Não realiza escrituração, apuração
          tributária ou comunicação com órgãos governamentais. A seleção de
          perfis é explícita e não representa autenticação segura para exposição
          pública.
        </div>
        <h2>Documentação</h2>
        <p>
          Os arquivos em <code>docs/</code> descrevem arquitetura, modelo
          relacional, regras, pipeline, decisões técnicas e o guia de
          demonstração de cinco minutos. A documentação OpenAPI está disponível
          no backend.
        </p>
        <h2>Dados e indicadores</h2>
        <p>
          1.500 documentos, 45 projetos, 80 fornecedores e 65 usuários
          sintéticos, com semente 42. As métricas são calculadas no backend e
          respeitam os filtros. Regularização = regulares / recebidos; resolução
          = média de dias das pendências encerradas; vencimento = abertas
          vencidas / abertas.
        </p>
        <a className="button secondary" href="/api/dataset">
          <ArrowDownToLine size={16} />
          Baixar a planilha demonstrativa
        </a>
      </section>
    </>
  );
}
