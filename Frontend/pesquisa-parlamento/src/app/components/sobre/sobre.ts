import { Component } from '@angular/core';
import { SeoService } from '../../services/seo-service';

@Component({
  selector: 'app-sobre',
  imports: [],
  templateUrl: './sobre.html',
  styleUrl: './sobre.css',
})
export class Sobre {
  constructor(seo: SeoService) {
    seo.update({
      title: 'Sobre o Democrac_IA - Parlamento Português com IA',
      path: '/info/sobre',
      description:
        'O Democrac_IA é uma ferramenta open-source que usa IA para tornar a Assembleia da República acessível a todos os cidadãos portugueses. Pesquisa debates, deputados e notícias de política.',
      ogDescription:
        'Ferramenta open-source que usa IA para tornar a Assembleia da República acessível a todos. Pesquisa debates, deputados e notícias de política portuguesa.',
      twitterDescription:
        'Ferramenta open-source que usa IA para tornar a Assembleia da República acessível a todos os cidadãos portugueses.',
    });
  }
}
