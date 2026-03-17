import { Component } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-sobre',
  imports: [],
  templateUrl: './sobre.html',
  styleUrl: './sobre.css',
})
export class Sobre {
  constructor(private meta: Meta, private title: Title) {
    this.title.setTitle('Democrac_IA - Sobre o Projeto');
    this.meta.updateTag({
      name: 'description',
      content: 'Descobre o Democrac_IA: ferramenta open-source que torna o parlamento português acessível com IA.',
    });
    this.meta.updateTag({ property: 'og:title', content: 'Democrac_IA - Sobre o Projeto' });
    this.meta.updateTag({ property: 'og:description', content: 'Ferramenta open-source de análise de debates parlamentares com IA.' });
    this.meta.updateTag({ property: 'og:url', content: 'https://www.democrac-ia.pt/info/sobre' });
    this.meta.updateTag({ name: 'twitter:title', content: 'Democrac_IA - Sobre o Projeto' });
    this.meta.updateTag({ name: 'twitter:description', content: 'Ferramenta open-source de análise de debates parlamentares com IA.' });
  }
}
