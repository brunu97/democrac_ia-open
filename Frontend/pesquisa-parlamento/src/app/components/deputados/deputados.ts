import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
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
export class Deputados implements OnInit {
  estado$ = new BehaviorSubject<Estado>({
    loading: false,
    tabela: null,
    erro: null,
  });

  deputadosLista: any[] = [];
  deputadosFiltrados: any[] = [];
  deputadoSelecionado: string = '';
  deputadoId: number | null = null;
  filtroTexto: string = '';
  filtroNome: string = '';

  dataInicio: Date | null = null;
  dataFim: Date | null = null;

  off_set_atual = 0;
  pagina_tamanho = 15;
  dadosTotais = 0;

  private pendingId: number | null = null;

  constructor(
    private pesquisaService: PesquisaService,
    private meta: Meta,
    private title: Title,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.title.setTitle('Deputados da Assembleia da República - Intervenções Parlamentares | Democrac_IA');
    this.meta.updateTag({
      name: 'description',
      content: 'Consulta as intervenções parlamentares de deputados da Assembleia da República Portuguesa desde 2006. Pesquisa o que cada deputado disse no parlamento.',
    });
    this.meta.updateTag({ property: 'og:title', content: 'Deputados da Assembleia da República - Intervenções Parlamentares | Democrac_IA' });
    this.meta.updateTag({ property: 'og:description', content: 'Consulta as intervenções parlamentares de deputados da Assembleia da República Portuguesa desde 2006. Pesquisa o que cada deputado disse no parlamento.' });
    this.meta.updateTag({ property: 'og:url', content: 'https://www.democrac-ia.pt/deputados' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: 'Deputados da Assembleia da República | Democrac_IA' });
    this.meta.updateTag({ name: 'twitter:description', content: 'Consulta as intervenções de 1266 deputados da Assembleia da República desde 2006. Pesquisa o que cada deputado disse no parlamento.' });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });

    this.carregarDeputados();
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        const id = +idParam;
        if (this.deputadosLista.length > 0) {
          this.selecionarPorId(id);
        } else {
          this.pendingId = id;
        }
      }
    });
  }

  private selecionarPorId(id: number) {
    const dep = this.deputadosLista.find(d => d.id === id);
    if (!dep) return;

    this.deputadoId = dep.id;
    this.deputadoSelecionado = dep.nome;
    this.filtroNome = dep.nome;

    const qp = this.route.snapshot.queryParamMap;
    const offset = +(qp.get('offset') || '0');
    this.filtroTexto = qp.get('texto') || '';
    const inicioStr = qp.get('inicio');
    const fimStr = qp.get('fim');
    this.dataInicio = inicioStr ? new Date(inicioStr) : null;
    this.dataFim = fimStr ? new Date(fimStr) : null;

    this.obtemTabela(id, offset);
  }

  private atualizarEstado(parcial: Partial<Estado>) {
    this.estado$.next({ ...this.estado$.value, ...parcial });
  }

  private carregarDeputados() {
    this.pesquisaService.get_oradores().subscribe({
      next: (res: any) => {
        this.deputadosLista = res;
        this.deputadosFiltrados = res;
        if (this.pendingId !== null) {
          this.selecionarPorId(this.pendingId);
          this.pendingId = null;
        }
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
    const dep = this.deputadosLista.find(d => d.nome === event.option.value);
    if (dep) {
      this.limparFiltros();
      this.router.navigate(['/deputados', dep.id]);
    }
  }

  obtemTabela(id: number, offset: number) {
    this.atualizarEstado({ loading: true, tabela: null, erro: null });

    const pesquisa: TabelaRequest = {
      id: id,
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
        this.atualizarUrlComEstado(offset);
      },
      error: () => {
        this.atualizarEstado({
          loading: false,
          erro: 'Ocorreu um erro ao carregar a tabela. Tenta mais tarde.',
        });
      },
    });
  }

  private atualizarUrlComEstado(offset: number) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        offset: offset > 0 ? offset : null,
        texto: this.filtroTexto || null,
        inicio: this.dataInicio ? this.formatarDataParaAPI(this.dataInicio) : null,
        fim: this.dataFim ? this.formatarDataParaAPI(this.dataFim) : null,
      },
      replaceUrl: true,
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
    if (this.deputadoId !== null) {
      this.obtemTabela(this.deputadoId, 0);
    }
  }

  limparFiltros() {
    this.dataInicio = null;
    this.dataFim = null;
    this.filtroTexto = '';
  }

  proximaPagina() {
    if (this.deputadoId !== null) {
      this.obtemTabela(this.deputadoId, this.off_set_atual + this.pagina_tamanho);
    }
  }

  paginaAnterior() {
    if (this.deputadoId !== null) {
      this.obtemTabela(this.deputadoId, this.off_set_atual - this.pagina_tamanho);
    }
  }

  primeiraPagina() {
    if (this.deputadoId !== null && this.temAnterior) {
      this.obtemTabela(this.deputadoId, 0);
    }
  }

  ultimaPagina() {
    if (this.deputadoId !== null && this.temProxima) {
      const ultimaOffset =
        Math.floor((this.dadosTotais - 1) / this.pagina_tamanho) * this.pagina_tamanho;
      this.obtemTabela(this.deputadoId, ultimaOffset);
    }
  }

  get temAnterior(): boolean {
    return this.off_set_atual > 0;
  }

  get temProxima(): boolean {
    return this.off_set_atual + this.pagina_tamanho < this.dadosTotais;
  }
}
