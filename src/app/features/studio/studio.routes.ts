import { CanDeactivateFn, Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { StudioEditorComponent } from './studio-editor.component';

const TITLE = 'Admin · Abadá Música';

/** Asks before leaving the editor with unsaved changes. */
const leaveEditor: CanDeactivateFn<StudioEditorComponent> = c => c.canLeave();

/** The new admin, at /admin/new while it lives beside the old one at /admin. */
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
    ],
  },
];
