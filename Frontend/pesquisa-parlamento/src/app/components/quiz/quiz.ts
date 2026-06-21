import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { SharedImports } from '../../shared/imports';
import { PesquisaService } from '../../services/pesquisa-service';
import { BehaviorSubject } from 'rxjs';
import { QuizPergunta } from '../../models/models';
import { SeoService } from '../../services/seo-service';

interface Estado {
  loading: boolean;
  pergunta: QuizPergunta | null;
  selecionado: string | null;
  erro: string | null;
}

@Component({
  selector: 'app-quiz',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, SharedImports],
  templateUrl: './quiz.html',
  styleUrl: './quiz.css',
})
export class Quiz implements OnInit, OnDestroy {
  estado$ = new BehaviorSubject<Estado>({
    loading: true,
    pergunta: null,
    selecionado: null,
    erro: null,
  });

  constructor(
    private pesquisaService: PesquisaService,
    private destroyRef: DestroyRef,
    seo: SeoService,
  ) {
    seo.update({
      title: 'Quiz Parlamentar - Conheces os Deputados Portugueses? | Democrac_IA',
      path: '/quiz',
      description:
        'Quiz interativo sobre política portuguesa: adivinha qual deputado disse esta frase no parlamento. Testa os teus conhecimentos sobre os deputados da Assembleia da República.',
      ogDescription:
        'Quiz interativo: adivinha qual deputado disse esta frase no parlamento português. Testa os teus conhecimentos sobre política portuguesa.',
      twitterDescription:
        'Adivinha qual deputado disse esta frase no parlamento. Testa os teus conhecimentos sobre política portuguesa.',
    });
  }

  ngOnInit() {
    this.carregarPergunta();
  }

  private atualizarEstado(parcial: Partial<Estado>) {
    this.estado$.next({ ...this.estado$.value, ...parcial });
  }

  carregarPergunta() {
    this.atualizarEstado({ loading: true, erro: null, selecionado: null, pergunta: null });
    this.pesquisaService.get_quiz()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (res: QuizPergunta) => {
        console.log(res)
        this.atualizarEstado({ loading: false, pergunta: res });
      },
      error: () => {
        this.atualizarEstado({ loading: false, erro: 'Erro ao carregar. Tenta mais tarde.' });
      },
    });
  }

  selecionar(opcao: string) {
    if (this.estado$.value.selecionado) return;
    this.atualizarEstado({ selecionado: opcao });
  }

  getClasse(opcao: string, correto: string, selecionado: string | null): string {
    if (!selecionado) return 'opcao';
    if (opcao === correto) return 'opcao correto';
    if (opcao === selecionado && selecionado !== 'desistiu') return 'opcao errado';
    return 'opcao inativo';
  }

  gerarLink(fonte: string, pagina: number): string {
    const fileName = fonte.split('/').pop() || '';
    const semExtensao = fileName.replace('.pdf', '');
    const partes = semExtensao.split('_');
    const legis = partes[0];
    const sessao = partes[1];
    const numero = partes[2];
    const data = partes[3];
    return `https://debates.parlamento.pt/catalogo/r3/dar/01/${legis}/${sessao}/${numero}/${data}/${pagina}`;
  }

  desistir() {
    if (this.estado$.value.selecionado) return;
    const correto = this.estado$.value.pergunta?.correto ?? '';
    this.atualizarEstado({ selecionado: 'desistiu' });
  }

  ngOnDestroy() {
    this.estado$.complete();
  }
}
