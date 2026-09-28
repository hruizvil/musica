import { Injectable, signal } from '@angular/core';

const KEY = 'novo-theme';

/**
 * Light or dark for the new design only. Kept apart from the current site's theme, so
 * switching here never changes how the current site looks. Light is the default for
 * everyone; a visitor who switches to dark keeps it.
 */
@Injectable({ providedIn: 'root' })
export class NovoThemeService {
  readonly dark = signal<boolean>(this.initial());

  toggle(): void {
    const next = !this.dark();
    this.dark.set(next);
    try { localStorage.setItem(KEY, next ? 'dark' : 'light'); } catch { /* storage blocked: still works for this visit */ }
  }

  private initial(): boolean {
    try {
      return localStorage.getItem(KEY) === 'dark';
    } catch {
      return false;
    }
  }
}
