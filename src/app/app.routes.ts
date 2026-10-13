import { Routes } from '@angular/router';
import { NOVO_ROUTES } from './features/novo-design/novo.routes';

/** Used for the admin page titles. The main site sets its own, per language. */
const SITE = 'Abadá Música';

export const routes: Routes = [
  // Admin stays at the top level, outside both designs. Sign-in first, so /admin/login
  // isn't taken for a page inside the admin.
  {
    path: 'admin/login',
    title: `Admin · ${SITE}`,
    loadComponent: () => import('./features/admin/admin-login.component').then(m => m.AdminLoginComponent),
  },
  { path: 'admin', loadChildren: () => import('./features/studio/studio.routes').then(m => m.STUDIO_ROUTES) },

  // The classic design was retired; send its old links to the matching page on the main site.
  { path: 'classico', redirectTo: '', pathMatch: 'full' },
  { path: 'classico/musicas/:id', redirectTo: 'cantigas/:id' },
  { path: 'classico/musicas', redirectTo: 'cantigas' },
  { path: 'classico/toques/:id', redirectTo: 'toques/:id' },
  { path: 'classico/toques', redirectTo: 'toques' },
  { path: 'classico/:a', redirectTo: '' },
  { path: 'classico/:a/:b', redirectTo: '' },

  // The experiment's old address: its pages now live at the root.
  { path: 'novo', redirectTo: '', pathMatch: 'full' },
  { path: 'novo/:a', redirectTo: '/:a' },
  { path: 'novo/:a/:b', redirectTo: '/:a/:b' },

  // The main site: English at /, Portuguese at /pt.
  ...NOVO_ROUTES,
];
