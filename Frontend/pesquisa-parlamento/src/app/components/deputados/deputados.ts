import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SharedImports } from '../../shared/imports';
import { TabelaRequest } from '../../models/models';
import { PesquisaService } from '../../services/pesquisa-service';
import { BehaviorSubject } from 'rxjs';
import { Meta, Title } from '@angular/platform-browser';
import { SelecionadoPipe } from '../../selecionado.pipe';

interface Estado {
  loading: boolean;
  tabela: any | null;
  erro: string | null;
}

@Component({
  selector: 'app-deputados',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, SharedImports, SelecionadoPipe],
  templateUrl: './deputados.html',
  styleUrl: './deputados.css',
})
export class Deputados {
  estado$ = new BehaviorSubject<Estado>({
    loading: false,
    tabela: null,
    erro: null,
  });

  deputadosLista: any[] = [];
  deputadosFiltrados: any[] = [];
  deputadoSelecionado: string = '';
  filtroTexto: string = '';

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
    this.title.setTitle('Democrac_IA - Intervenções por Deputado');
    this.meta.updateTag({
      name: 'description',
      content: 'Consulta todas as intervenções parlamentares por deputado na Assembleia da República Portuguesa. Pesquisa entre 1.266 deputados e 364.676 intervenções desde 2006.',
    });
    this.meta.updateTag({ property: 'og:title', content: 'Democrac_IA - Intervenções por Deputado' });
    this.meta.updateTag({ property: 'og:description', content: 'Consulta as intervenções parlamentares de 1.266 deputados da Assembleia da República desde 2006.' });
    this.meta.updateTag({ property: 'og:url', content: 'https://www.democrac-ia.pt/deputados' });
    this.meta.updateTag({ name: 'twitter:title', content: 'Democrac_IA - Intervenções por Deputado' });
    this.meta.updateTag({ name: 'twitter:description', content: 'Consulta as intervenções parlamentares de 1.266 deputados da Assembleia da República desde 2006.' });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });

    // Carregar lista de deputados ao iniciar
    this.carregarDeputados();
  }

  private atualizarEstado(parcial: Partial<Estado>) {
    this.estado$.next({ ...this.estado$.value, ...parcial });
  }

  private carregarDeputados() {
    this.pesquisaService.get_oradores().subscribe({
      next: (res: any) => {
        this.deputadosLista = res;
        this.deputadosFiltrados = res;
      },
      error: () => {
        this.atualizarEstado({
          erro: 'Ocorreu um erro ao carregar a lista de deputados.',
        });
      },
    });
  }

  filtrarDeputados(event: Event) {
    const valor = (event.target as HTMLInputElement).value.toLowerCase();
    this.deputadosFiltrados = this.deputadosLista.filter((d) =>
      d.nome.toLowerCase().includes(valor),
    );
  }

  onDeputadoSelecionado(event: any) {
    this.limparFiltros();
    this.deputadoSelecionado = event.option.value;
    this.obtemTabela(this.deputadoSelecionado, 0);
  }

  obtemTabela(nome: string, offset: number) {
    this.atualizarEstado({ loading: true, tabela: null, erro: null });

    let pesquisa: TabelaRequest = {
      nome: nome,
      offset: offset,
      ...(this.filtroTexto ? { texto: this.filtroTexto } : {}),
      ...(this.dataInicio ? { data_inicio: this.formatarDataParaAPI(this.dataInicio) } : {}),
      ...(this.dataFim ? { data_fim: this.formatarDataParaAPI(this.dataFim) } : {}),
    };

    this.pesquisaService.get_tabela(pesquisa).subscribe({
      next: (res: any) => {
        this.off_set_atual = offset;
        this.dadosTotais = res.total;
        this.atualizarEstado({ loading: false, tabela: res });
      },
      error: () => {
        this.atualizarEstado({
          loading: false,
          erro: 'Ocorreu um erro ao carregar a tabela. Tenta mais tarde.',
        });
      },
    });
  }

  private formatarDataParaAPI(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
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

  pesquisarTexto() {
    if (this.deputadoSelecionado) {
      this.obtemTabela(this.deputadoSelecionado, 0);
    }
  }

  limparFiltros() {
    this.dataInicio = null;
    this.dataFim = null;
    this.filtroTexto = '';
  }

  proximaPagina() {
    this.obtemTabela(this.deputadoSelecionado, this.off_set_atual + this.pagina_tamanho);
  }

  paginaAnterior() {
    this.obtemTabela(this.deputadoSelecionado, this.off_set_atual - this.pagina_tamanho);
  }

  primeiraPagina() {
    if (this.deputadoSelecionado && this.temAnterior) {
      this.obtemTabela(this.deputadoSelecionado, 0);
    }
  }

  ultimaPagina() {
    if (this.deputadoSelecionado && this.temProxima) {
      const ultimaOffset =
        Math.floor((this.dadosTotais - 1) / this.pagina_tamanho) * this.pagina_tamanho;
      this.obtemTabela(this.deputadoSelecionado, ultimaOffset);
    }
  }

  get temAnterior(): boolean {
    return this.off_set_atual > 0;
  }

  get temProxima(): boolean {
    return this.off_set_atual + this.pagina_tamanho < this.dadosTotais;
  }
}
