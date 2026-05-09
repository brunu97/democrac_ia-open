import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { SharedImports } from '../../shared/imports';
import { PesquisaService } from '../../services/pesquisa-service';
import { CompararResultado, DeputadoLista, DeputadoStats } from '../../models/models';

interface Estado {
  loadingLista: boolean;
  loadingComparar: boolean;
  resultado: CompararResultado | null;
  erro: string | null;
}

@Component({
  selector: 'app-comparar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, SharedImports],
  templateUrl: './comparar.html',
  styleUrl: './comparar.css',
})
export class Comparar implements OnInit, OnDestroy {
  estado$ = new BehaviorSubject<Estado>({
    loadingLista: true,
    loadingComparar: false,
    resultado: null,
    erro: null,
  });

  deputados: DeputadoLista[] = [];
  filtrados1: DeputadoLista[] = [];
  filtrados2: DeputadoLista[] = [];

  selecao1: DeputadoLista | string = '';
  selecao2: DeputadoLista | string = '';

  constructor(
    private pesquisaService: PesquisaService,
    private meta: Meta,
    private title: Title,
    private cdr: ChangeDetectorRef,
    private destroyRef: DestroyRef,
  ) {
    this.title.setTitle('Comparar Deputados - Estatísticas Parlamentares | Democrac_IA');
    this.meta.updateTag({ name: 'description', content: 'Compara estatísticas de intervenções de qualquer par de deputados da Assembleia da República.' });
    this.meta.updateTag({ property: 'og:title', content: 'Comparar Deputados | Democrac_IA' });
    this.meta.updateTag({ property: 'og:description', content: 'Compara lado a lado deputados do parlamento português.' });
    this.meta.updateTag({ property: 'og:url', content: 'https://www.democrac-ia.pt/comparar' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: 'Comparar Deputados | Democrac_IA' });
    this.meta.updateTag({ name: 'twitter:description', content: 'Compara lado a lado deputados do parlamento português.' });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
  }

  ngOnInit() {
    this.pesquisaService.get_oradores()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.deputados = res;
          this.filtrados1 = res;
          this.filtrados2 = res;
          this.atualizar({ loadingLista: false });
        },
        error: () => {
          this.atualizar({ loadingLista: false, erro: 'Erro ao carregar a lista.' });
        },
      });
  }

  ngOnDestroy() {
    this.estado$.complete();
  }

  private atualizar(parcial: Partial<Estado>) {
    this.estado$.next({ ...this.estado$.value, ...parcial });
  }

  filtrar(slot: 1 | 2, event: Event) {
    const valor = (event.target as HTMLInputElement).value.toLowerCase();
    const lista = this.deputados.filter(d =>
      d.nome.toLowerCase().includes(valor) ||
      (d.partido && d.partido.toLowerCase().includes(valor))
    );
    if (slot === 1) this.filtrados1 = lista;
    else this.filtrados2 = lista;
  }

  formatarDeputado = (dep: any): string => {
    if (!dep) return '';
    if (typeof dep === 'string') return dep;
    return dep.partido ? `${dep.nome} (${dep.partido})` : dep.nome;
  };

  private idSelecao(s: DeputadoLista | string): number | null {
    return s && typeof s === 'object' && 'id' in s ? s.id : null;
  }

  comparar() {
    const id1 = this.idSelecao(this.selecao1);
    const id2 = this.idSelecao(this.selecao2);
    if (id1 === null || id2 === null) return;
    if (id1 === id2) {
      this.atualizar({ erro: 'Os deputados têm de ser diferentes.', resultado: null });
      return;
    }

    this.atualizar({ loadingComparar: true, erro: null, resultado: null });

    this.pesquisaService.comparar(id1, id2)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.atualizar({ loadingComparar: false, resultado: res });
          this.cdr.markForCheck();
        },
        error: () => {
          this.atualizar({ loadingComparar: false, erro: 'Erro ao comparar. Tenta mais tarde.' });
          this.cdr.markForCheck();
        },
      });
  }

  trocar() {
    const tmp = this.selecao1;
    this.selecao1 = this.selecao2;
    this.selecao2 = tmp;
    if (this.estado$.value.resultado) {
      this.comparar();
    }
  }

  podeComparar(): boolean {
    const id1 = this.idSelecao(this.selecao1);
    const id2 = this.idSelecao(this.selecao2);
    return id1 !== null && id2 !== null && id1 !== id2;
  }

  vencedor(d1: DeputadoStats, d2: DeputadoStats, campo: 'total' | 'tamanho_medio'): 1 | 2 | 0 {
    if (d1[campo] === d2[campo]) return 0;
    return d1[campo] > d2[campo] ? 1 : 2;
  }

  formatarData(data: string | null | undefined): string {
    if (!data) return '—';
    const partes = data.split('-');
    if (partes.length !== 3) return data;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  anosAtividade(d: DeputadoStats): number {
    if (!d.primeira || !d.ultima) return 0;
    const a = new Date(d.primeira).getFullYear();
    const b = new Date(d.ultima).getFullYear();
    return b - a + 1;
  }

  anosUniao(d1: DeputadoStats, d2: DeputadoStats): string[] {
    const set = new Set<string>();
    d1.por_ano.forEach(a => set.add(a.ano));
    d2.por_ano.forEach(a => set.add(a.ano));
    return Array.from(set).sort();
  }

  contarAno(d: DeputadoStats, ano: string): number {
    return d.por_ano.find(a => a.ano === ano)?.n ?? 0;
  }

  maxAnoComum(d1: DeputadoStats, d2: DeputadoStats): number {
    let m = 0;
    for (const a of d1.por_ano) m = Math.max(m, a.n);
    for (const a of d2.por_ano) m = Math.max(m, a.n);
    return m || 1;
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
}
