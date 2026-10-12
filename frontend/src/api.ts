export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "X-Demo-User": localStorage.getItem("demo-user") || "1",
  };
  if (!(options.body instanceof FormData))
    headers["Content-Type"] = "application/json";
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
  if (!response.ok) {
    const result = await response
      .json()
      .catch(() => ({ detail: "Não foi possível conectar à API." }));
    throw new Error(
      typeof result.detail === "string" ? result.detail : "Dados inválidos.",
    );
  }
  return response.json();
}
export const brl = (value: string | number) =>
  Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const number = (value: number) => value.toLocaleString("pt-BR");
export const date = (value: string) =>
  new Date(
    value.length === 10 ? `${value}T12:00:00` : value,
  ).toLocaleDateString("pt-BR");
export const label = (value: string) =>
  ({
    regular: "Regular",
    pendente: "Pendente",
    inconsistente: "Inconsistente",
    aberta: "Aberta",
    em_tratamento: "Em tratamento",
    aguardando_revisao: "Aguardando revisão",
    encerrada: "Encerrada",
    em_revisao: "Em revisão",
    aprovada: "Aprovada",
    devolvida: "Devolvida",
    classificacao: "Classificação",
    atribuicao: "Atribuição",
    validacao: "Validação",
    duplicidade: "Duplicidade",
    baixa: "Baixa",
    media: "Média",
    alta: "Alta",
    critica: "Crítica",
    simulada: "Simulada",
    com_rejeicoes: "Com rejeições",
    concluida: "Concluída",
    vencida: "Vencida",
  })[value] || value.replaceAll("_", " ");
