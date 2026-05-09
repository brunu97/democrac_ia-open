import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CompararResultado, DeputadoLista, ExportarRequest, ExportarResultado, PesquisaRequest, PesquisaResultado, QuizPergunta, TabelaRequest } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class PesquisaService {
  private apiUrl = '/api';
  
  constructor(private http: HttpClient) { }
  
  procurar(pergunta: PesquisaRequest): Observable<PesquisaResultado> {
    return this.http.post<PesquisaResultado>(`${this.apiUrl}/pesquisa`, pergunta);
  }
  
  get_oradores(): Observable<DeputadoLista[]> {
    return this.http.get<DeputadoLista[]>(`${this.apiUrl}/lista-oradores`);
  }
  
  get_tabela(nome: TabelaRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tabela`, nome);
  }

  exportar(pedido: ExportarRequest): Observable<ExportarResultado> {
    return this.http.post<ExportarResultado>(`${this.apiUrl}/exportar`, pedido);
  }

  get_noticias(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/noticias`);
  }

  get_quiz(): Observable<QuizPergunta> {
    return this.http.get<QuizPergunta>(`${this.apiUrl}/quiz`);
  }

  comparar(id1: number, id2: number): Observable<CompararResultado> {
    return this.http.post<CompararResultado>(`${this.apiUrl}/comparar`, { id1, id2 });
  }
}