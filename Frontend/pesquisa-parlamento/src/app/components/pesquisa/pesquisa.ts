import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedImports } from '../../shared/imports';
import {
  ModoPesquisa,
  PesquisaRequest,
  PesquisaResultado,
  TabelaRequest,
} from '../../models/models';
import { PesquisaService } from '../../services/pesquisa-service';
import { MatChipListbox } from '@angular/material/chips';
import { BehaviorSubject } from 'rxjs';
import { MarkdownModule, MarkdownService } from 'ngx-markdown';
import { Meta, Title } from '@angular/platform-browser';
import { SelecionadoPipe } from '../../selecionado.pipe';

interface Estado {
  loading: boolean;
  resposta: PesquisaResultado | null;
  tabela: any | null;
  erro: string | null;
}

@Component({
  selector: 'app-pesquisa',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, SharedImports, MarkdownModule],
  providers: [MarkdownService],
  templateUrl: './pesquisa.html',
  styleUrl: './pesquisa.css',
})
export class Pesquisa {
  estado$ = new BehaviorSubject<Estado>({
    loading: false,
    resposta: null,
    tabela: null,
    erro: null,
  });

  usarIA: boolean = true;
  pergunta: string = '';
  modoSelecionado: string = ModoPesquisa.PESQUISA;
  ModoPesquisa = ModoPesquisa;
  anos: number[] = Array.from({ length: 2026 - 2006 + 1 }, (_, i) => 2006 + i);
  anosSelecionados: number[] = [];
  filtroTexto: string = '';

  // Filtros de data
  dataInicio: Date | null = null;
  dataFim: Date | null = null;

  off_set_atual = 0;
  pagina_tamanho = 15;
  dadosTotais = 0;

  constructor(
    private pesquisaService: PesquisaService,
    private meta: Meta,
    private title: Title,
  ) {
    this.title.setTitle('Democrac_IA - Pesquisa Debates da Assembleia da República com IA');
    this.meta.updateTag({
      name: 'description',
      content: 'Pesquisa debates e intervenções da Assembleia da República Portuguesa com Inteligência Artificial. Analisa o que os deputados disseram sobre qualquer tema político.',
    });
    this.meta.updateTag({ property: 'og:title', content: 'Democrac_IA - Pesquisa Debates da Assembleia da República com IA' });
    this.meta.updateTag({ property: 'og:description', content: 'Pesquisa debates e intervenções da Assembleia da República Portuguesa com Inteligência Artificial. Analisa o que os deputados disseram sobre qualquer tema político.' });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: 'https://www.democrac-ia.pt/' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: 'Democrac_IA - Pesquisa Debates da Assembleia da República com IA' });
    this.meta.updateTag({ name: 'twitter:description', content: 'Pesquisa debates e intervenções da Assembleia da República com IA. O que disseram os deputados sobre qualquer tema político.' });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
  }

  private atualizarEstado(parcial: Partial<Estado>) {
    this.estado$.next({ ...this.estado$.value, ...parcial });
  }

  onAnoChange(event: any) {
    this.anosSelecionados = event.value;
  }

  limparSelecao(chipList: MatChipListbox) {
    chipList.value = [];
    this.anosSelecionados = [];
  }

  limparPesquisa() {
    this.dataInicio = null;
    this.dataFim = null;
    this.filtroTexto = '';
  }

  fazerPesquisa() {
    this.atualizarEstado({ loading: true, resposta: null, tabela: null, erro: null });

    const modo =
      this.modoSelecionado === ModoPesquisa.PESQUISA && !this.usarIA
        ? ModoPesquisa.SIMPLES
        : this.modoSelecionado;

    let pesquisa: PesquisaRequest = {
      pergunta: this.pergunta,
      modo: modo,
      anos: this.anosSelecionados,
    };

    this.pesquisaService.procurar(pesquisa).subscribe({
      next: (res: PesquisaResultado) => {
        res.pergunta = this.pergunta;
        res.modo = modo;
        res.anos = this.anosSelecionados;
        this.pergunta = '';
        this.atualizarEstado({ loading: false, resposta: res });
      },
      error: () => {
        this.atualizarEstado({
          loading: false,
          erro: 'Ocorreu um erro ao processar a pesquisa. Tenta mais tarde.',
        });
      },
    });
  }

  gerarLink(pdf: string) {
    const fileName = pdf.split('/').pop() || '';
    const semExtensao = fileName.replace('.pdf', '');
    const partes = semExtensao.split('_');
    const legis = partes[0];
    const sessao = partes[1];
    const numero = partes[2];
    const data = partes[3];
    return `https://debates.parlamento.pt/catalogo/r3/dar/01/${legis}/${sessao}/${numero}/${data}`;
  }

  obtemDataFonte(pdf: string) {
    const fileName = pdf.split('/').pop() || '';
    const semExtensao = fileName.replace('.pdf', '');
    const dataOriginal = semExtensao.split('_')[3];
    const [ano, mes, dia] = dataOriginal.split('-');
    return `${dia} ${mes} ${ano}`;
  }

  selecionarModo(modo: string) {
    this.modoSelecionado = modo;
  }

  mostraSelecionados() {
    return this.anosSelecionados.length === 0 || this.anos.length === this.anosSelecionados.length
      ? 'Todos os anos'
      : 'Selecionados: ' + this.anosSelecionados.length;
  }
}
