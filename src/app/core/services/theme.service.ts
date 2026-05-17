import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal<boolean>(this.getInitialPreference());

  toggle(): void {
    const next = !this.isDark();
    this.isDark.set(next);
    localStorage.setItem('capoeira-theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
  }

  init(): void {
    document.documentElement.classList.toggle('dark', this.isDark());
  }

  private getInitialPreference(): boolean {
    const stored = localStorage.getItem('capoeira-theme');
    if (stored) return stored === 'dark';
    return false; // default light
  }
}
