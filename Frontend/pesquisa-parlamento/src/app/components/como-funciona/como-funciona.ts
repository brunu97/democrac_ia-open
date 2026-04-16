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
    this.title.setTitle('Como Funciona a Pesquisa Parlamentar com IA | Democrac_IA');
    this.meta.updateTag({
      name: 'description',
      content: 'Descobre como o Democrac_IA usa Inteligência Artificial (FAISS, Sentence Transformers, Groq) para pesquisar debates da Assembleia da República. Projeto open-source.',
    });
    this.meta.updateTag({ property: 'og:title', content: 'Como Funciona a Pesquisa Parlamentar com IA | Democrac_IA' });
    this.meta.updateTag({ property: 'og:description', content: 'Descobre como o Democrac_IA usa IA para pesquisar debates da Assembleia da República Portuguesa. Tecnologia open-source.' });
    this.meta.updateTag({ property: 'og:url', content: 'https://www.democrac-ia.pt/info/como-funciona' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: 'Como Funciona a Pesquisa Parlamentar com IA | Democrac_IA' });
    this.meta.updateTag({ name: 'twitter:description', content: 'Como o Democrac_IA usa IA para pesquisar debates da Assembleia da República. Projeto open-source.' });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
  }
}
