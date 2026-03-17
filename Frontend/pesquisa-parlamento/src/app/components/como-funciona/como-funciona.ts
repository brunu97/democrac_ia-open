import { Component } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-como-funciona',
  imports: [],
  templateUrl: './como-funciona.html',
  styleUrl: './como-funciona.css',
})
export class ComoFunciona {
  constructor(
    private meta: Meta,
    private title: Title,
  ) {
    this.title.setTitle('Democrac_IA - Como Funciona a Pesquisa com IA');
    this.meta.updateTag({
      name: 'description',
      content: 'Descobre como o Democrac_IA funciona. Tecnologia open-source disponível no GitHub.',
    });
    this.meta.updateTag({ property: 'og:title', content: 'Democrac_IA - Como Funciona a Pesquisa com IA' });
    this.meta.updateTag({ property: 'og:description', content: 'Descobre como o Democrac_IA utiliza IA para analisar debates parlamentares.' });
    this.meta.updateTag({ property: 'og:url', content: 'https://www.democrac-ia.pt/info/como-funciona' });
    this.meta.updateTag({ name: 'twitter:title', content: 'Democrac_IA - Como Funciona a Pesquisa com IA' });
    this.meta.updateTag({ name: 'twitter:description', content: 'Descobre como o Democrac_IA utiliza IA para analisar debates parlamentares.' });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
  }
}
