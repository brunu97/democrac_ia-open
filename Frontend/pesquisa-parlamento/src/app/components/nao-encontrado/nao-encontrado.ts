import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatAnchor } from "@angular/material/button";

@Component({
  selector: 'app-nao-encontrado',
  imports: [MatAnchor],
  templateUrl: './nao-encontrado.html',
  styleUrl: './nao-encontrado.css',
})
export class NaoEncontrado {
  constructor(private router: Router) {}

  voltar() {
    this.router.navigate(['/']);
  }
}