import { Routes } from '@angular/router';
import { NovoShellComponent } from './novo-shell.component';

const SITE = 'Abadá Música';

/** The new design ("Abadá"). Everything lives under /novo, beside the current site. */
export const NOVO_ROUTES: Routes = [
  {
    path: '',
    component: NovoShellComponent,
    children: [
      { path: '', title: SITE, loadComponent: () => import('./novo-home.component').then(m => m.NovoHomeComponent) },
      { path: 'toques', title: 'Toques · ' + SITE, loadComponent: () => import('./novo-toques.component').then(m => m.NovoToquesComponent) },
      { path: 'toques/:id', loadComponent: () => import('./novo-toque.component').then(m => m.NovoToqueComponent) },
      { path: 'cantigas', title: 'Cantigas · ' + SITE, loadComponent: () => import('./novo-cantigas.component').then(m => m.NovoCantigasComponent) },
      { path: 'cantigas/:id', loadComponent: () => import('./novo-cantiga.component').then(m => m.NovoCantigaComponent) },
      { path: 'curtidas', title: 'Curtidas · ' + SITE, loadComponent: () => import('./novo-curtidas.component').then(m => m.NovoCurtidasComponent) },
      // Addresses from the earlier experiment at /novo, so old links still land somewhere real.
      { path: 'musicas', redirectTo: 'cantigas', pathMatch: 'full' },
      { path: 'musicas/:id', redirectTo: 'cantigas/:id' },
      { path: '**', redirectTo: '' },
    ],
  },
];
