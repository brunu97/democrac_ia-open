import { Component } from '@angular/core';
import { SharedImports } from '../../shared/imports';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-como-usar',
  imports: [SharedImports],
  templateUrl: './como-usar.html',
  styleUrl: './como-usar.css',
})
export class ComoUsar {
  constructor(
    private meta: Meta,
    private title: Title,
  ) {
    this.title.setTitle('Democrac_IA - Guia de Utilização');
    this.meta.updateTag({
      name: 'description',
      content: 'Guia completo para usar o Democrac_IA: modos de pesquisa, dicas para melhores resultados, como consultar a Constituição e interpretar as fontes parlamentares.',
    });
    this.meta.updateTag({ property: 'og:title', content: 'Democrac_IA - Guia de Utilização' });
    this.meta.updateTag({ property: 'og:description', content: 'Guia completo para usar o Democrac_IA: modos de pesquisa, dicas para melhores resultados e como consultar a Constituição.' });
    this.meta.updateTag({ property: 'og:url', content: 'https://www.democrac-ia.pt/info/como-usar' });
    this.meta.updateTag({ name: 'twitter:title', content: 'Democrac_IA - Guia de Utilização' });
    this.meta.updateTag({ name: 'twitter:description', content: 'Guia completo para usar o Democrac_IA: modos de pesquisa, dicas para melhores resultados e como consultar a Constituição.' });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
  }
}
