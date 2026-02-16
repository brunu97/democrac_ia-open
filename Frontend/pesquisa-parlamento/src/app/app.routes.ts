import { Routes } from '@angular/router';
import { Pesquisa } from './components/pesquisa/pesquisa';
import { ComoUsar } from './components/como-usar/como-usar';
import { ComoFunciona } from './components/como-funciona/como-funciona';
import { Sobre } from './components/sobre/sobre';
import { NaoEncontrado } from './components/nao-encontrado/nao-encontrado';


export const routes: Routes = [
    { path: '', component: Pesquisa },
    { path: 'info/como-usar', component: ComoUsar },
    { path: 'info/como-funciona', component: ComoFunciona },
    { path: 'info/sobre', component: Sobre },
    { path: '**', component: NaoEncontrado }
];

