import { Component } from '@angular/core';
import { SeoService } from '../../services/seo-service';

@Component({
  selector: 'app-como-funciona',
  imports: [],
  templateUrl: './como-funciona.html',
  styleUrl: './como-funciona.css',
})
export class ComoFunciona {
  constructor(seo: SeoService) {
    seo.update({
      title: 'Como Funciona a Pesquisa Parlamentar com IA | Democrac_IA',
      path: '/info/como-funciona',
      description:
        'Descobre como o Democrac_IA usa Inteligência Artificial (FAISS, Sentence Transformers, Groq) para pesquisar debates da Assembleia da República. Projeto open-source.',
      ogDescription:
        'Descobre como o Democrac_IA usa IA para pesquisar debates da Assembleia da República Portuguesa. Tecnologia open-source.',
      twitterDescription:
        'Como o Democrac_IA usa IA para pesquisar debates da Assembleia da República. Projeto open-source.',
    });
  }
}
