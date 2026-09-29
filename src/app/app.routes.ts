import { Routes } from '@angular/router';
import { NOVO_ROUTES } from './features/novo-design/novo.routes';

/** Titles for the classic design's pages. The main site sets its own, per language. */
const SITE = 'Abadá Música';

export const routes: Routes = [
  // Admin stays at the top level, outside both designs. Sign-in first, so /admin/login
  // isn't taken for a page inside the admin.
  {
    path: 'admin/login',
    loadComponent: () => import('./layout/shell/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '', title: `Admin · ${SITE}`, loadComponent: () => import('./features/admin/admin-login.component').then(m => m.AdminLoginComponent) },
    ],
  },
  { path: 'admin', loadChildren: () => import('./features/studio/studio.routes').then(m => m.STUDIO_ROUTES) },

  // The classic design, kept at /classico during the move to the new design.
  {
    path: 'classico',
    loadComponent: () => import('./layout/shell/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '', title: `${SITE} — Biblioteca musical da capoeira`, loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent) },
      { path: 'musicas', title: `Músicas · ${SITE}`, loadComponent: () => import('./features/songs/song-list/song-list.component').then(m => m.SongListComponent) },
      { path: 'musicas/:id', loadComponent: () => import('./features/songs/song-detail/song-detail.component').then(m => m.SongDetailComponent) },
      { path: 'toques', title: `Toques · ${SITE}`, loadComponent: () => import('./features/toques/toque-list/toque-list.component').then(m => m.ToqueListComponent) },
      { path: 'toques/:id', loadComponent: () => import('./features/toques/toque-detail/toque-detail.component').then(m => m.ToqueDetailComponent) },
      { path: 'videos', title: `Vídeos · ${SITE}`, loadComponent: () => import('./features/videos/video-list/video-list.component').then(m => m.VideoListComponent) },
      { path: 'minhas', title: `Minhas · ${SITE}`, loadComponent: () => import('./features/minhas/minhas.component').then(m => m.MinhasComponent) },
      {
        path: 'minhas/tocar',
        title: `Tocar favoritas · ${SITE}`,
        loadComponent: () => import('./features/minhas/player/favorites-player.component').then(m => m.FavoritesPlayerComponent),
      },
      { path: '**', title: `Página não encontrada · ${SITE}`, loadComponent: () => import('./features/not-found/not-found.component').then(m => m.NotFoundComponent) },
    ],
  },

  // The experiment's old address: its pages now live at the root.
  { path: 'novo', redirectTo: '', pathMatch: 'full' },
  { path: 'novo/:a', redirectTo: '/:a' },
  { path: 'novo/:a/:b', redirectTo: '/:a/:b' },

  // The main site: English at /, Portuguese at /pt.
  ...NOVO_ROUTES,
];
