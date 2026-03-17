import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PesquisaRequest, PesquisaResultado, QuizPergunta, TabelaRequest } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class PesquisaService {
  private apiUrl = '/api';
  
  constructor(private http: HttpClient) { }
  
  procurar(pergunta: PesquisaRequest): Observable<PesquisaResultado> {
    return this.http.post<PesquisaResultado>(`${this.apiUrl}/pesquisa`, pergunta);
  }
  
  get_oradores(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/lista-oradores`);
  }
  
  get_tabela(nome: TabelaRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tabela`, nome);
  }

  get_noticias(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/noticias`);
  }

  get_quiz(): Observable<QuizPergunta> {
    return this.http.get<QuizPergunta>(`${this.apiUrl}/quiz`);
  }
}