import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
      },
      {
        path: 'musicas',
        loadComponent: () => import('./features/songs/song-list/song-list.component').then(m => m.SongListComponent),
      },
      {
        path: 'musicas/:id',
        loadComponent: () => import('./features/songs/song-detail/song-detail.component').then(m => m.SongDetailComponent),
      },
      {
        path: 'toques',
        loadComponent: () => import('./features/toques/toque-list/toque-list.component').then(m => m.ToqueListComponent),
      },
      {
        path: 'toques/:id',
        loadComponent: () => import('./features/toques/toque-detail/toque-detail.component').then(m => m.ToqueDetailComponent),
      },
      {
        path: 'videos',
        loadComponent: () => import('./features/videos/video-list/video-list.component').then(m => m.VideoListComponent),
      },
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent),
      },
      {
        path: 'admin/login',
        loadComponent: () => import('./features/admin/admin-login.component').then(m => m.AdminLoginComponent),
      },
      {
        path: 'admin',
        loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent),
        canActivate: [authGuard],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
