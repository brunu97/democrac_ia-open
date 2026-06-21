import { Component } from '@angular/core';
import { SharedImports } from '../../shared/imports';
import { SeoService } from '../../services/seo-service';

@Component({
  selector: 'app-como-usar',
  imports: [SharedImports],
  templateUrl: './como-usar.html',
  styleUrl: './como-usar.css',
})
export class ComoUsar {
  constructor(seo: SeoService) {
    seo.update({
      title: 'Democrac_IA - Guia de Utilização',
      path: '/info/como-usar',
      description:
        'Guia completo para usar o Democrac_IA: modos de pesquisa, dicas para melhores resultados, como consultar a Constituição e interpretar as fontes parlamentares.',
      ogDescription:
        'Guia completo para usar o Democrac_IA: modos de pesquisa, dicas para melhores resultados e como consultar a Constituição.',
    });
  }
}
