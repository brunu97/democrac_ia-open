import { Injectable } from '@angular/core';
import { Intervencao, PesquisaResultado } from '../models/models';

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
    linhas.push(
      ['Nome', 'Partido', 'Data', 'Página', 'Ficheiro', 'Texto'].map(csvEscape).join(','),
    );
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
    const urlsPorLinha: string[] = intervencoes.map((i) => linkPdfOficial(i.ficheiro, i.pagina));

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
        doc.text(rodape, dados.settings.margin.left, doc.internal.pageSize.getHeight() - 20);
      },
    });

    doc.save(`${nomeFicheiro(meta)}.pdf`);
  }

  async exportarRespostaPDF(resultado: PesquisaResultado): Promise<void> {
    const { marked } = await import('marked');
    const corpo = await marked.parse(resultado.resposta || '');

    const meta = [
      resultado.modo && `Modo: ${NOMES_MODO[resultado.modo] ?? resultado.modo}`,
      resultado.anos?.length && `Anos: ${resultado.anos.join(', ')}`,
      `Exportado em: ${new Date().toLocaleString('pt-PT')}`,
    ]
      .filter(Boolean)
      .map((t) => escapeHtml(t as string))
      .join(' · ');

    const fontes = resultado.fontes?.length
      ? `<section class="fontes"><h2>Fontes</h2><p class="aviso">A IA pode conter erros. Verifica sempre as fontes.</p><ol>${resultado.fontes
          .map((f) => fonteParaHtml(f, resultado.modo))
          .join('')}</ol></section>`
      : '';

    const html = `<!doctype html>
<html lang="pt">
<head>
<meta charset="utf-8">
<title>${escapeHtml(resultado.pergunta || 'Democrac_IA')}</title>
<style>${ESTILO_RESPOSTA_PDF}</style>
</head>
<body>
  <header>
    <div class="marca">Democrac_IA</div>
    <div class="meta">${meta}</div>
  </header>
  <h1 class="pergunta">${escapeHtml(resultado.pergunta || '')}</h1>
  <article class="resposta">${corpo}</article>
  ${fontes}
</body>
</html>`;

    // Imprime num iframe escondido — fica na mesma janela, sem abrir tab nova.
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);

    const win = iframe.contentWindow!;
    win.document.open();
    win.document.write(html);
    win.document.close();

    win.onafterprint = () => iframe.remove();
    setTimeout(() => {
      win.focus();
      win.print();
      // Limpeza de reserva caso o evento onafterprint não dispare.
      setTimeout(() => iframe.remove(), 60000);
    }, 300);
  }
}

const NOMES_MODO: Record<string, string> = {
  pesquisa: 'Pesquisa',
  explicativo: 'Explicativo',
  imaginativo: 'Imaginativo',
  simples: 'Simples',
  constituicao: 'Constituição',
};

function fonteParaHtml(fonte: any, modo?: string): string {
  const conteudo = `<div class="fonte-content">${escapeHtml(fonte.content || '')}</div>`;

  if (modo === 'constituicao') {
    const titulo = `#${fonte.rank} Artigo ${escapeHtml(String(fonte.artigo_numero))}º — ${escapeHtml(fonte.artigo_titulo || '')}`;
    const sub = fonte.parte
      ? `<div class="fonte-meta">${escapeHtml(fonte.parte)} › ${escapeHtml(fonte.titulo_secao || '')}</div>`
      : '';
    return `<li><div class="fonte-titulo">${titulo}</div>${sub}${conteudo}</li>`;
  }

  const url = linkPdfOficial(fonte.path, fonte.page);
  const data = escapeHtml(dataDeSource(fonte.source));
  const link = url ? `<a href="${url}">🔗 ${data}</a>` : data;
  return `<li><div class="fonte-titulo">#${fonte.rank} ${link} · Página ${escapeHtml(String(fonte.page))}</div>${conteudo}</li>`;
}

const ESTILO_RESPOSTA_PDF = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1a202c; line-height: 1.6; max-width: 820px; margin: 0 auto; padding: 32px 28px; }
  header { border-bottom: 2px solid #214e80; padding-bottom: 12px; margin-bottom: 22px; }
  .marca { font-size: 22px; font-weight: 700; color: #214e80; }
  .meta { font-size: 12px; color: #718096; margin-top: 4px; }
  h1.pergunta { font-size: 19px; line-height: 1.35; margin: 0 0 22px; }
  .resposta { font-size: 14px; }
  .resposta h1 { font-size: 18px; }
  .resposta h2 { font-size: 16px; }
  .resposta h3, .resposta h4 { font-size: 14px; }
  .resposta h1, .resposta h2, .resposta h3, .resposta h4 { color: #214e80; margin: 18px 0 8px; }
  .resposta p { margin: 0 0 10px; }
  .resposta ul, .resposta ol { margin: 0 0 12px; padding-left: 22px; }
  .resposta li { margin-bottom: 4px; }
  .resposta blockquote { border-left: 3px solid #cbd5e0; margin: 0 0 12px; padding: 4px 14px; color: #4a5568; font-style: italic; }
  .resposta code { background: #f1f5f9; padding: 1px 5px; border-radius: 4px; font-size: 0.9em; }
  .resposta pre { background: #f1f5f9; padding: 12px; border-radius: 6px; overflow-x: auto; }
  .resposta pre code { background: none; padding: 0; }
  .resposta table { border-collapse: collapse; width: 100%; margin: 0 0 12px; font-size: 13px; }
  .resposta th, .resposta td { border: 1px solid #cbd5e0; padding: 6px 8px; text-align: left; }
  .resposta th { background: #eef2f7; }
  .fontes { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
  .fontes h2 { font-size: 16px; color: #214e80; margin: 0 0 4px; }
  .aviso { font-size: 12px; color: #a0aec0; margin: 0 0 12px; }
  .fontes ol { padding-left: 20px; }
  .fontes li { margin-bottom: 14px; font-size: 13px; }
  .fonte-titulo { font-weight: 600; margin-bottom: 3px; }
  .fonte-meta { color: #718096; font-size: 12px; margin-bottom: 3px; }
  .fonte-content { color: #4a5568; font-size: 12px; }
  a { color: #2563eb; text-decoration: none; }
  @page { margin: 16mm; }
  @media print {
    body { padding: 0; max-width: none; }
    .resposta li, .fontes li, blockquote, pre, table { page-break-inside: avoid; }
    h1, h2, h3, h4 { page-break-after: avoid; }
  }
`;

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
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const data = new Date().toISOString().slice(0, 10);
  return `democrac-ia_${slug}_${data}`;
}

function escapeHtml(valor: string): string {
  if (valor == null) return '';
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function dataDeSource(pdf: string): string {
  if (!pdf) return '';
  const fileName = pdf.split('/').pop() || '';
  const dataOriginal = fileName.replace('.pdf', '').split('_')[3];
  if (!dataOriginal) return '';
  const [ano, mes, dia] = dataOriginal.split('-');
  return `${dia}/${mes}/${ano}`;
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
