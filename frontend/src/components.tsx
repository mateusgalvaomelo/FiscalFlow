import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, X } from "lucide-react";
import { label } from "./api";

export function Badge({ value }: { value: string }) {
  return (
    <span className={`badge ${value}`}>
      <span /> {label(value)}
    </span>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <div className="spinner" />
      Carregando informações…
    </div>
  );
}
export function ErrorState({ error }: { error: Error | null }) {
  return (
    <div className="error" role="alert">
      <AlertCircle size={18} />
      {error?.message || "Não foi possível carregar os dados."}
    </div>
  );
}
export function Empty() {
  return (
    <div className="empty">Nenhum registro encontrado para esta seleção.</div>
  );
}
export function Pager({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="pager">
      <span>
        {total.toLocaleString("pt-BR")} registros · Página {page} de{" "}
        {Math.max(1, Math.ceil(total / 20))}
      </span>
      <div>
        <button
          aria-label="Página anterior"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          aria-label="Próxima página"
          disabled={page * 20 >= total}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const root = ref.current!;
    root.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const elements = root.querySelectorAll<HTMLElement>(
          "button,input,textarea,select,a[href]",
        );
        const first = elements[0],
          last = elements[elements.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === root)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button aria-label="Fechar" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Heading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
