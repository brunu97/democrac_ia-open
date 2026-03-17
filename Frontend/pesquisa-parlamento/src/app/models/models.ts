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
  nome: string;
  offset: number;
  texto?: string;
  data_inicio?: string;
  data_fim?: string;
}
export interface Fontes {
 
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