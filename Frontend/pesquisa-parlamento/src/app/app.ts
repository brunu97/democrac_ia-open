import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Barra } from "./components/barra/barra";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, Barra],
  templateUrl: './app.html'
})
export class App {
  protected readonly title = signal('pesquisa-parlamento');
}
