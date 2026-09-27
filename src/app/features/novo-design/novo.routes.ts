import { Routes } from '@angular/router';
import { NovoShellComponent } from './novo-shell.component';

const SITE = 'Novo design · Abadá Música';

/** The new-design experiment. Everything here lives under /novo, beside the current site. */
export const NOVO_ROUTES: Routes = [
  {
    path: '',
    component: NovoShellComponent,
    children: [
      { path: '', title: SITE, loadComponent: () => import('./novo-home.component').then(m => m.NovoHomeComponent) },
      { path: 'musicas', title: 'Músicas · ' + SITE, loadComponent: () => import('./novo-songs.component').then(m => m.NovoSongsComponent) },
      { path: 'musicas/:id', loadComponent: () => import('./novo-song.component').then(m => m.NovoSongComponent) },
      { path: 'toques', title: 'Toques · ' + SITE, loadComponent: () => import('./novo-toques.component').then(m => m.NovoToquesComponent) },
      { path: 'toques/:id', loadComponent: () => import('./novo-toque.component').then(m => m.NovoToqueComponent) },
      { path: '**', redirectTo: '' },
    ],
  },
];
