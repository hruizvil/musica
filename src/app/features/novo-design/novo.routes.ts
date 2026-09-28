import { Routes } from '@angular/router';
import { NovoShellComponent } from './novo-shell.component';

/**
 * The pages of the main site. Mounted twice under one shell: at the root in English and
 * under "pt" in Portuguese. One shell for both means switching language never rebuilds
 * the frame, so the player keeps playing.
 *
 * No route titles here: each page sets its own title, description and hreflang links
 * through NovoSeoService, in the page's language.
 */
function pages(): Routes {
  return [
    { path: '', loadComponent: () => import('./novo-home.component').then(m => m.NovoHomeComponent) },
    { path: 'toques', loadComponent: () => import('./novo-toques.component').then(m => m.NovoToquesComponent) },
    { path: 'toques/:id', loadComponent: () => import('./novo-toque.component').then(m => m.NovoToqueComponent) },
    { path: 'cantigas', loadComponent: () => import('./novo-cantigas.component').then(m => m.NovoCantigasComponent) },
    { path: 'cantigas/:id', loadComponent: () => import('./novo-cantiga.component').then(m => m.NovoCantigaComponent) },
    { path: 'curtidas', loadComponent: () => import('./novo-curtidas.component').then(m => m.NovoCurtidasComponent) },
    { path: 'login', loadComponent: () => import('./novo-login.component').then(m => m.NovoLoginComponent) },
    // Addresses from the classic design and older experiments, so saved links still land.
    { path: 'musicas', redirectTo: 'cantigas', pathMatch: 'full' },
    { path: 'musicas/:id', redirectTo: 'cantigas/:id' },
    { path: 'minhas', redirectTo: 'curtidas', pathMatch: 'full' },
    { path: 'minhas/tocar', redirectTo: 'curtidas', pathMatch: 'full' },
    { path: 'roda', redirectTo: 'curtidas', pathMatch: 'full' },
    { path: 'videos', redirectTo: 'toques', pathMatch: 'full' },
    { path: 'membership', redirectTo: '', pathMatch: 'full' },
    { path: 'membership/success', redirectTo: '', pathMatch: 'full' },
  ];
}

const notFound = { path: '**', loadComponent: () => import('./novo-not-found.component').then(m => m.NovoNotFoundComponent) };

export const NOVO_ROUTES: Routes = [
  {
    path: '',
    component: NovoShellComponent,
    children: [
      { path: 'pt', children: [...pages(), notFound] },
      ...pages(),
      notFound,
    ],
  },
];
