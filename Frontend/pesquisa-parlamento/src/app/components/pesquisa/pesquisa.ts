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
import { MarkdownPipe } from '../../markdown-pipe';
import { MatChipListbox } from '@angular/material/chips';
import { BehaviorSubject } from 'rxjs';

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
  imports: [CommonModule, SharedImports, MarkdownPipe],
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

  pergunta: string = '';
  modoSelecionado: string = ModoPesquisa.PESQUISA;
  ModoPesquisa = ModoPesquisa;
  anos: number[] = Array.from({ length: 2026 - 2006 + 1 }, (_, i) => 2006 + i);
  anosSelecionados: number[] = [];
  deputadosLista: any[] = [];
  deputadosFiltrados: any[] = [];
  deputadoSelecinado: string = '';
  filtroTexto: string = '';

  off_set_atual = 0;
  pagina_tamanho = 15;
  dadosTotais = 0;

  constructor(private pesquisaService: PesquisaService) {}

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

  fazerPesquisa() {
    this.atualizarEstado({ loading: true, resposta: null, tabela: null, erro: null });

    let pesquisa: PesquisaRequest = {
      pergunta: this.pergunta,
      modo: this.modoSelecionado,
      anos: this.anosSelecionados,
    };

    this.pesquisaService.procurar(pesquisa).subscribe({
      next: (res: PesquisaResultado) => {
        res.pergunta = this.pergunta;
        res.modo = this.modoSelecionado;
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

    if (modo === ModoPesquisa.DEPUTADO && this.deputadosLista.length === 0) {
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
  }

  mostraSelecionados() {
    return this.anosSelecionados.length === 0 || this.anos.length === this.anosSelecionados.length
      ? 'Todos os anos'
      : 'Selecionados: ' + this.anosSelecionados.length;
  }

  obtemTabela(nome: string, offset: number) {
    this.atualizarEstado({ loading: true, resposta: null, tabela: null, erro: null });

    let pesquisa: TabelaRequest = {
      nome: nome,
      offset: offset,
      ...(this.filtroTexto ? { texto: this.filtroTexto } : {}),
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

  pesquisarTexto() {
    if (this.deputadoSelecinado) {
      this.obtemTabela(this.deputadoSelecinado, 0);
    }
  }

  proximaPagina() {
    this.obtemTabela(this.deputadoSelecinado, this.off_set_atual + this.pagina_tamanho);
  }

  paginaAnterior() {
    this.obtemTabela(this.deputadoSelecinado, this.off_set_atual - this.pagina_tamanho);
  }

  get temAnterior(): boolean {
    return this.off_set_atual > 0;
  }

  get temProxima(): boolean {
    return this.off_set_atual + this.pagina_tamanho < this.dadosTotais;
  }

  onDeputadoSelecionado(event: any) {
    this.deputadoSelecinado = event.option.value;
    this.obtemTabela(this.deputadoSelecinado, 0);
  }

  filtrarDeputados(event: Event) {
    const valor = (event.target as HTMLInputElement).value.toLowerCase();
    this.deputadosFiltrados = this.deputadosLista.filter((d) =>
      d.nome.toLowerCase().includes(valor),
    );
  }

  primeiraPagina() {
    if (this.deputadoSelecinado && this.temAnterior) {
      this.obtemTabela(this.deputadoSelecinado, 0);
    }
  }

  ultimaPagina() {
    if (this.deputadoSelecinado && this.temProxima) {
      const ultimaOffset = Math.floor((this.dadosTotais - 1) / this.pagina_tamanho) * this.pagina_tamanho;

      this.obtemTabela(this.deputadoSelecinado, ultimaOffset);
    }
  }
}
