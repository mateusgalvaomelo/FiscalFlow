export interface User {
  id: number;
  nome: string;
  area: string;
  perfil: string;
  email: string;
}
export interface Project {
  id: number;
  codigo: string;
  nome: string;
  area: string;
  centro_custo: string;
  documentos: number;
  pendentes: number;
  valor_total: string;
}
export interface Supplier {
  id: number;
  razao_social: string;
  categoria: string;
  identificador_ficticio: string;
  email: string;
  status: string;
}
export interface Issue {
  id: number;
  documento_id: number;
  tipo: string;
  descricao: string;
  severidade: string;
  status: string;
  prazo_resolucao: string;
  responsavel_id: number | null;
  documento?: string;
  vencida?: boolean;
}
export interface Justification {
  id: number;
  pendencia_id: number;
  texto: string;
  status: string;
  comentario_revisor: string | null;
  data_envio: string;
  usuario_id: number;
}
export interface Charge {
  id: number;
  pendencia_id: number;
  mensagem: string;
  data_envio: string;
  status: string;
  destinatario_id: number;
  tipo: string;
}
export interface Event {
  id: number;
  acao: string;
  timestamp: string;
  valor_anterior: string | null;
  valor_novo: string | null;
}
export interface Document {
  id: number;
  numero_documento: string;
  fornecedor_id: number;
  projeto_id: number | null;
  responsavel_id: number | null;
  data_emissao: string;
  data_recebimento: string;
  data_vencimento: string;
  valor: string;
  status: string;
  descricao: string;
  fornecedor: string;
  projeto: string;
  responsavel: string;
  pendencias: number;
}
export interface Detail extends Omit<
  Document,
  "fornecedor" | "projeto" | "pendencias"
> {
  fornecedor: Supplier;
  projeto: Project | null;
  pendencias: Issue[];
  justificativas: Justification[];
  cobrancas: Charge[];
  historico: Event[];
}
export interface Page<T> {
  items: T[];
  total: number;
  pagina: number;
  tamanho: number;
}
export interface Distribution {
  nome: string;
  quantidade: number;
}
export interface Dashboard {
  kpis: {
    documentos_recebidos: number;
    valor_total: string;
    documentos_regulares: number;
    documentos_pendentes: number;
    documentos_inconsistentes: number;
    pendencias_vencidas: number;
    pendencias_abertas: number;
    taxa_regularizacao: number;
    taxa_vencimento: number;
    tempo_medio_resolucao: number;
  };
  mensal: {
    mes: string;
    documentos: number;
    regulares: number;
    valor: string;
    taxa: number;
  }[];
  categorias: Distribution[];
  severidades: Distribution[];
  status: Distribution[];
  areas: Distribution[];
  projetos: { nome: string; valor: string }[];
}
export interface ImportRecord {
  id: number;
  nome_arquivo: string;
  data_importacao: string;
  registros_lidos: number;
  registros_validos: number;
  registros_rejeitados: number;
  tempo_execucao: string;
  status: string;
  rejeicoes: { linha: number; motivo: string }[];
}
export interface Category {
  prazo_dias: number;
  severidade: string;
  exige_justificativa: boolean;
}
export interface Settings {
  categorias: Record<string, Category>;
  notificacao_dias: number;
}
