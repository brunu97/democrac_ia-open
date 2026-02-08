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
}

export interface Fontes {
 
}

export enum ModoPesquisa {
  PESQUISA = 'pesquisa',
  EXPLICATIVO = 'explicativo',
  IMAGINATIVO = 'imaginativo',
  SIMPLES = 'simples',
  DEPUTADO = 'deputado'
}