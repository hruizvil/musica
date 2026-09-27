import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';
import { authGuard } from './core/guards/auth.guard';

/** Every route names its page, so a tab, a bookmark or the browser history says where
 *  you are instead of the same site name on every page. The song and toque pages set
 *  their own, from the song or toque being shown. */
const SITE = 'Abadá Música';

export const routes: Routes = [
  // Before the shell: its catch-all below would otherwise claim /admin.
  {
    path: 'admin',
    title: `Admin · ${SITE}`,
    loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent),
    canActivate: [authGuard],
  },
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: '',
        title: `${SITE} — Biblioteca musical da capoeira`,
        loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
      },
      {
        path: 'musicas',
        title: `Músicas · ${SITE}`,
        loadComponent: () => import('./features/songs/song-list/song-list.component').then(m => m.SongListComponent),
      },
      {
        path: 'musicas/:id',
        loadComponent: () => import('./features/songs/song-detail/song-detail.component').then(m => m.SongDetailComponent),
      },
      {
        path: 'toques',
        title: `Toques · ${SITE}`,
        loadComponent: () => import('./features/toques/toque-list/toque-list.component').then(m => m.ToqueListComponent),
      },
      {
        path: 'toques/:id',
        loadComponent: () => import('./features/toques/toque-detail/toque-detail.component').then(m => m.ToqueDetailComponent),
      },
      {
        path: 'videos',
        title: `Vídeos · ${SITE}`,
        loadComponent: () => import('./features/videos/video-list/video-list.component').then(m => m.VideoListComponent),
      },
      {
        path: 'minhas',
        title: `Minhas · ${SITE}`,
        loadComponent: () => import('./features/minhas/minhas.component').then(m => m.MinhasComponent),
      },
      {
        path: 'minhas/tocar',
        title: `Tocar favoritas · ${SITE}`,
        loadComponent: () =>
          import('./features/minhas/player/favorites-player.component').then(m => m.FavoritesPlayerComponent),
      },
      // Retired pages. Anyone arriving from an old bookmark, or from Stripe's return
      // link, lands somewhere real instead of on the not-found page.
      // pathMatch 'full': a redirect otherwise matches by prefix, and /membership/success
      // came out as /success.
      { path: 'roda', redirectTo: 'minhas', pathMatch: 'full' },
      { path: 'membership', redirectTo: '', pathMatch: 'full' },
      { path: 'membership/success', redirectTo: '', pathMatch: 'full' },
      {
        path: 'login',
        title: `Entrar · ${SITE}`,
        loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent),
      },
      {
        path: 'admin/login',
        title: `Admin · ${SITE}`,
        loadComponent: () => import('./features/admin/admin-login.component').then(m => m.AdminLoginComponent),
      },
      // Unknown addresses used to bounce silently to the home page, which read as the
      // link being broken for no reason. Now they say so, inside the normal header.
      {
        path: '**',
        title: `Página não encontrada · ${SITE}`,
        loadComponent: () => import('./features/not-found/not-found.component').then(m => m.NotFoundComponent),
      },
    ],
  },
];
