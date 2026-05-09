export interface PesquisaResultado {
  resposta: string;
  fontes: any[];
  error?: string;
  pergunta?: string;
  modo?: string;
  anos: number[]
}

export interface PesquisaRequest {
  pergunta: string;
  modo: string;
  anos: number[]
}

export interface TabelaRequest {
  id: number;
  offset: number;
  texto?: string;
  data_inicio?: string;
  data_fim?: string;
}

export interface ExportarRequest {
  id: number;
  texto?: string;
  data_inicio?: string;
  data_fim?: string;
}

export interface Intervencao {
  nome: string;
  partido: string;
  texto: string;
  ficheiro: string;
  pagina: number;
  data: string;
}

export interface ExportarResultado {
  nome_deputado: string;
  dados: Intervencao[];
}
export interface Fontes {
 
}

export interface DeputadoLista {
  id: number;
  nome: string;
  partido: string;
}

export interface AnoContagem {
  ano: string;
  n: number;
}

export interface IntervencaoRecente {
  texto: string;
  data: string;
  ficheiro: string;
  pagina: number;
}

export interface DeputadoStats {
  id: number;
  nome: string;
  partido: string;
  total: number;
  tamanho_medio: number;
  primeira: string;
  ultima: string;
  por_ano: AnoContagem[];
  recente: IntervencaoRecente | null;
}

export interface CompararResultado {
  deputado_1: DeputadoStats;
  deputado_2: DeputadoStats;
}

export interface QuizPergunta {
  citacao: string;
  opcoes: string[];
  correto: string;
  data: string;
  fonte: string;
  pagina: number;
}

export enum ModoPesquisa {
  PESQUISA = 'pesquisa',
  EXPLICATIVO = 'explicativo',
  IMAGINATIVO = 'imaginativo',
  SIMPLES = 'simples',
  DEPUTADO = 'deputado',
  CONSTITUICAO = 'constituicao'
}