import { Routes } from '@angular/router';
import { Pesquisa } from './components/pesquisa/pesquisa';
import { ComoUsar } from './components/como-usar/como-usar';
import { ComoFunciona } from './components/como-funciona/como-funciona';

export const routes: Routes = [
    { path: '', component: Pesquisa },
    { path: 'info/como-usar', component: ComoUsar },
    { path: 'info/como-funciona', component: ComoFunciona },
];

