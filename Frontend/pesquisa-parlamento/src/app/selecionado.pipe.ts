import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'selecionado',
  standalone: true,
})
// Utilizado para destacar texto da pesquisa
export class SelecionadoPipe implements PipeTransform {
    transform(texto: string, pesquisa: string): string {
        if (!pesquisa || !texto) return texto;
        const escaped = pesquisa.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'gi');
        
        return texto.replace(regex, '<span class="destaca-texto">$1</span>');
  }
}
