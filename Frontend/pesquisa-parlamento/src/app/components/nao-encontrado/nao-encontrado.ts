import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatAnchor } from "@angular/material/button";
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-nao-encontrado',
  imports: [MatAnchor],
  templateUrl: './nao-encontrado.html',
  styleUrl: './nao-encontrado.css',
})
export class NaoEncontrado {
  constructor(private router: Router, private meta: Meta, private title: Title) {
    this.title.setTitle('Democrac_IA - Página Não Encontrada');
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
  }

  voltar() {
    this.router.navigate(['/']);
  }
}