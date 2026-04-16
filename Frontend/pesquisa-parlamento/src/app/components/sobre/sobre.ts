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
    this.title.setTitle('Sobre o Democrac_IA - Parlamento Português com IA');
    this.meta.updateTag({
      name: 'description',
      content: 'O Democrac_IA é uma ferramenta open-source que usa IA para tornar a Assembleia da República acessível a todos os cidadãos portugueses. Pesquisa debates, deputados e notícias de política.',
    });
    this.meta.updateTag({ property: 'og:title', content: 'Sobre o Democrac_IA - Parlamento Português com IA' });
    this.meta.updateTag({ property: 'og:description', content: 'Ferramenta open-source que usa IA para tornar a Assembleia da República acessível a todos. Pesquisa debates, deputados e notícias de política portuguesa.' });
    this.meta.updateTag({ property: 'og:url', content: 'https://www.democrac-ia.pt/info/sobre' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: 'Sobre o Democrac_IA - Parlamento Português com IA' });
    this.meta.updateTag({ name: 'twitter:description', content: 'Ferramenta open-source que usa IA para tornar a Assembleia da República acessível a todos os cidadãos portugueses.' });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
  }
}
