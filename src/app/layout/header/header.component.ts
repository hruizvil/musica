import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';
import { FirebaseService } from '../../core/services/firebase.service';
import { SearchBarComponent } from '../../shared/components/search-bar/search-bar.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, SearchBarComponent],
  template: `
    <header class="sticky top-0 z-50 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 shadow-sm">
      <div class="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">

        <!-- Logo -->
        <a routerLink="/" class="flex items-center gap-2 shrink-0">
          <span class="font-display text-lg font-bold text-capoeira-brown dark:text-capoeira-gold leading-tight">
            Abadá<br class="hidden sm:block"><span class="text-capoeira-gold dark:text-capoeira-cream"> Música</span>
          </span>
        </a>

        <!-- Desktop nav -->
        <nav class="hidden md:flex items-center gap-1 text-sm font-medium ml-4">
          @for (link of navLinks; track link.path) {
            <a [routerLink]="link.path" routerLinkActive="text-capoeira-gold"
               class="px-3 py-1.5 rounded-md text-stone-600 dark:text-stone-300 hover:text-capoeira-brown dark:hover:text-capoeira-cream hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
              {{ link.label }}
            </a>
          }
          @if (firebase.currentUser()) {
            <a routerLink="/admin" routerLinkActive="text-capoeira-gold"
               class="px-3 py-1.5 rounded-md text-capoeira-gold hover:bg-capoeira-gold/10 transition-colors font-semibold">
              Admin
            </a>
          }
        </nav>

        <!-- Search -->
        <div class="flex-1 max-w-sm ml-auto">
          <app-search-bar />
        </div>

        <!-- Dark mode toggle -->
        <button (click)="theme.toggle()" class="p-2 rounded-md text-stone-500 hover:text-capoeira-brown dark:hover:text-capoeira-gold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors" aria-label="Alternar tema">
          @if (theme.isDark()) {
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
          } @else {
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path stroke-linecap="round" stroke-width="2" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          }
        </button>

        <!-- Mobile menu button -->
        <button (click)="mobileOpen.set(!mobileOpen())" class="md:hidden p-2 rounded-md text-stone-500" aria-label="Menu">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
      </div>

      <!-- Mobile nav -->
      @if (mobileOpen()) {
        <nav class="md:hidden border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-2 flex flex-col gap-1">
          @for (link of navLinks; track link.path) {
            <a [routerLink]="link.path" routerLinkActive="text-capoeira-gold"
               (click)="mobileOpen.set(false)"
               class="px-3 py-2 rounded-md text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-sm font-medium">
              {{ link.label }}
            </a>
          }
          @if (firebase.currentUser()) {
            <a routerLink="/admin" (click)="mobileOpen.set(false)"
               class="px-3 py-2 rounded-md text-capoeira-gold hover:bg-capoeira-gold/10 text-sm font-semibold">
              Admin
            </a>
          }
        </nav>
      }
    </header>
  `,
})
export class HeaderComponent {
  theme = inject(ThemeService);
  firebase = inject(FirebaseService);
  mobileOpen = signal(false);

  navLinks = [
    { path: '/musicas', label: 'Músicas' },
    { path: '/toques', label: 'Toques' },
    { path: '/videos', label: 'Vídeos' },
  ];
}
