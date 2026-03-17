import { Component } from '@angular/core';
import { SharedImports } from '../../shared/imports';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-barra',
  imports: [SharedImports, RouterLink, RouterLinkActive],
  templateUrl: './barra.html',
  styleUrl: './barra.scss',
})
export class Barra {
  menuAberto = false;

  abrirFecharMenu(): void {
    this.menuAberto = !this.menuAberto;
  }

  fecharMenu(): void {
    this.menuAberto = false;
  }

}
