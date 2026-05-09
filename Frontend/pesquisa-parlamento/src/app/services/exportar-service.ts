import { Injectable } from '@angular/core';
import { Intervencao } from '../models/models';

export interface MetaExportacao {
  nome_deputado: string;
  partido_deputado?: string;
  filtro_texto?: string;
  data_inicio?: string;
  data_fim?: string;
}

@Injectable({ providedIn: 'root' })
export class ExportarService {
  exportarCSV(intervencoes: Intervencao[], meta: MetaExportacao): void {
    const linhas: string[] = [];
    linhas.push(['Nome', 'Partido', 'Data', 'Página', 'Ficheiro', 'Texto'].map(csvEscape).join(','));
    for (const i of intervencoes) {
      linhas.push(
        [
          csvEscape(i.nome),
          csvEscape(i.partido),
          csvEscape(i.data),
          csvEscape(String(i.pagina)),
          csvEscape(linkPdfOficial(i.ficheiro, i.pagina)),
          csvEscape(i.texto),
        ].join(','),
      );
    }
    const conteudo = '﻿' + linhas.join('\r\n');
    const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
    descarregar(blob, `${nomeFicheiro(meta)}.csv`);
  }

  async exportarPDF(intervencoes: Intervencao[], meta: MetaExportacao): Promise<void> {
    const [{ jsPDF }, autoTableMod] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const autoTable = (autoTableMod as any).default || (autoTableMod as any).autoTable;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

    const titulo = meta.partido_deputado
      ? `Intervenções de ${meta.nome_deputado} (${meta.partido_deputado})`
      : `Intervenções de ${meta.nome_deputado}`;
    doc.setFontSize(14);
    doc.text(titulo, 40, 40);

    doc.setFontSize(9);
    doc.setTextColor(100);
    const linhasMeta: string[] = [];
    linhasMeta.push(`Total: ${intervencoes.length} intervenções`);
    if (meta.filtro_texto) linhasMeta.push(`Texto: "${meta.filtro_texto}"`);
    if (meta.data_inicio) linhasMeta.push(`Desde: ${meta.data_inicio}`);
    if (meta.data_fim) linhasMeta.push(`Até: ${meta.data_fim}`);
    linhasMeta.push(`Exportado em: ${new Date().toLocaleString('pt-PT')}`);
    doc.text(linhasMeta.join('   ·   '), 40, 58);

    const LINK_COL = 3;
    const urlsPorLinha: string[] = intervencoes.map(i => linkPdfOficial(i.ficheiro, i.pagina));

    const body = intervencoes.map((i, idx) => [
      i.data || '',
      i.partido || '',
      i.texto || '',
      urlsPorLinha[idx] ? 'Ver PDF' : '',
    ]);

    autoTable(doc, {
      startY: 75,
      head: [['Data', 'Partido', 'Intervenção', 'Fonte']],
      body,
      styles: { fontSize: 8, cellPadding: 4, valign: 'top', overflow: 'linebreak' },
      headStyles: { fillColor: [33, 78, 128], textColor: 255 },
      alternateRowStyles: { fillColor: [247, 250, 253] },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 60 },
        2: { cellWidth: 'auto' },
        3: {
          cellWidth: 70,
          textColor: [20, 80, 180],
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
        },
      },
      margin: { left: 40, right: 40, bottom: 40 },
      didDrawCell: (dados: any) => {
        if (
          dados.section === 'body' &&
          dados.column.index === LINK_COL &&
          typeof dados.row.index === 'number'
        ) {
          const url = urlsPorLinha[dados.row.index];
          if (!url) return;
          const { x, y, width, height } = dados.cell;
          doc.link(x, y, width, height, { url });
        }
      },
      didDrawPage: (dados: any) => {
        const pagina = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(120);
        const rodape = meta.partido_deputado
          ? `Democrac_IA · ${meta.nome_deputado} (${meta.partido_deputado}) · página ${pagina}`
          : `Democrac_IA · ${meta.nome_deputado} · página ${pagina}`;
        doc.text(
          rodape,
          dados.settings.margin.left,
          doc.internal.pageSize.getHeight() - 20,
        );
      },
    });

    doc.save(`${nomeFicheiro(meta)}.pdf`);
  }
}

function csvEscape(valor: string): string {
  if (valor == null) return '';
  const s = String(valor).replace(/"/g, '""');
  return `"${s}"`;
}

function descarregar(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function nomeFicheiro(meta: MetaExportacao): string {
  const base = meta.partido_deputado
    ? `${meta.nome_deputado}-${meta.partido_deputado}`
    : meta.nome_deputado;
  const slug = base
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const data = new Date().toISOString().slice(0, 10);
  return `democrac-ia_${slug}_${data}`;
}

function linkPdfOficial(ficheiro: string, pagina: number): string {
  if (!ficheiro) return '';
  const fileName = ficheiro.split('/').pop() || '';
  const semExtensao = fileName.replace('.pdf', '');
  const partes = semExtensao.split('_');
  if (partes.length < 4) return '';
  const [legis, sessao, numero, data] = partes;
  return `https://debates.parlamento.pt/catalogo/r3/dar/01/${legis}/${sessao}/${numero}/${data}/${pagina}`;
}
