import { CanDeactivateFn, Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { StudioEditorComponent } from './studio-editor.component';

const TITLE = 'Admin · Abadá Música';

/** Asks before leaving an editor with unsaved changes. */
const leaveEditor: CanDeactivateFn<{ canLeave(): boolean }> = c => c.canLeave();

/** The admin, at /admin. */
export const STUDIO_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./studio-shell.component').then(m => m.StudioShellComponent),
    children: [
      { path: '', title: TITLE, loadComponent: () => import('./studio-overview.component').then(m => m.StudioOverviewComponent) },
      { path: 'songs', title: `Songs · ${TITLE}`, loadComponent: () => import('./studio-songs.component').then(m => m.StudioSongsComponent) },
      { path: 'songs/:id', title: `Edit song · ${TITLE}`, component: StudioEditorComponent, canDeactivate: [leaveEditor] },
      { path: 'add', title: `Add song · ${TITLE}`, component: StudioEditorComponent, canDeactivate: [leaveEditor] },
      { path: 'toques', title: `Toques · ${TITLE}`, loadComponent: () => import('./studio-toques.component').then(m => m.StudioToquesComponent) },
      { path: 'toques/:id', title: `Toque pattern · ${TITLE}`, loadComponent: () => import('./studio-toque-editor.component').then(m => m.StudioToqueEditorComponent), canDeactivate: [leaveEditor] },
      // The new admin briefly lived at /admin/new.
      { path: 'new', redirectTo: '', pathMatch: 'full' },
      { path: 'new/:rest', redirectTo: ':rest' },
    ],
  },
];
