import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedImports } from '../../shared/imports';
import { PesquisaService } from '../../services/pesquisa-service';
import { BehaviorSubject } from 'rxjs';
import { DomSanitizer, SafeHtml, Meta, Title } from '@angular/platform-browser';
import { marked } from 'marked';

interface Noticia {
  titulo: string;
  fonte: string;
  link: string;
  pub_date: string;
}

interface Estado {
  loading: boolean;
  noticias: Noticia[];
  resumo: SafeHtml;
  atualizado_em: string | null;
  erro: string | null;
}

@Component({
  selector: 'app-noticias',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, SharedImports],
  templateUrl: './noticias.html',
  styleUrl: './noticias.css',
})
export class Noticias implements OnInit {
  estado$ = new BehaviorSubject<Estado>({
    loading: true,
    noticias: [],
    resumo: '',
    atualizado_em: null,
    erro: null,
  });

  constructor(
    private pesquisaService: PesquisaService,
    private sanitizer: DomSanitizer,
    private meta: Meta,
    private title: Title,
  ) {
    this.title.setTitle('Democrac_IA - Notícias de Política Portuguesa');
    this.meta.updateTag({
      name: 'description',
      content: 'Notícias em tempo real sobre política portuguesa com resumo gerado por IA. Atualizado a cada 2 horas com as principais fontes de notícias portuguesas.',
    });
    this.meta.updateTag({ property: 'og:title', content: 'Democrac_IA - Notícias de Política Portuguesa' });
    this.meta.updateTag({ property: 'og:description', content: 'Notícias em tempo real sobre política portuguesa com resumo gerado por IA. Atualizado a cada 2 horas.' });
    this.meta.updateTag({ property: 'og:url', content: 'https://www.democrac-ia.pt/noticias' });
    this.meta.updateTag({ name: 'twitter:title', content: 'Democrac_IA - Notícias de Política Portuguesa' });
    this.meta.updateTag({ name: 'twitter:description', content: 'Notícias em tempo real sobre política portuguesa com resumo gerado por IA. Atualizado a cada 2 horas.' });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
  }

  ngOnInit() {
    this.carregarNoticias();
  }

  private atualizarEstado(parcial: Partial<Estado>) {
    this.estado$.next({ ...this.estado$.value, ...parcial });
  }

  carregarNoticias() {
    this.atualizarEstado({ loading: true, erro: null });
    this.pesquisaService.get_noticias().subscribe({
      next: (res: any) => {
        const resumoHtml = this.sanitizer.bypassSecurityTrustHtml(
          marked.parse(res.resumo || '') as string
        );
        this.atualizarEstado({
          loading: false,
          noticias: res.noticias,
          resumo: resumoHtml,
          atualizado_em: res.atualizado_em,
        });
      },
      error: () => {
        this.atualizarEstado({
          loading: false,
          erro: 'Ocorreu um erro ao carregar as notícias. Tenta mais tarde.',
        });
      },
    });
  }

  formatarData(dataStr: string): string {
    if (!dataStr) return '';
    const data = new Date(dataStr);
    return data.toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
