import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatAnchor } from "@angular/material/button";
import { SeoService } from '../../services/seo-service';

@Component({
  selector: 'app-nao-encontrado',
  imports: [MatAnchor],
  templateUrl: './nao-encontrado.html',
  styleUrl: './nao-encontrado.css',
})
export class NaoEncontrado {
  constructor(private router: Router, seo: SeoService) {
    seo.update({
      title: 'Democrac_IA - Página Não Encontrada',
      index: false,
    });
  }

  voltar() {
    this.router.navigate(['/']);
  }
}