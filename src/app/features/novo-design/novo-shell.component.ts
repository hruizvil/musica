import { Component, DOCUMENT, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { DataService } from '../../core/services/data.service';
import { FirebaseService } from '../../core/services/firebase.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { SigninPromptComponent } from '../../shared/components/signin-prompt/signin-prompt.component';
import { NgTemplateOutlet } from '@angular/common';
import { NovoIconComponent } from './novo-ui';

const FONTS_ID = 'novo-design-fonts';
const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap';

/**
 * The frame for the new-design experiment ("Estúdio") at /novo. It sits beside the
 * site's own shell, not inside it: nothing here changes the current site, and the current
 * header, theme and pages never appear in here. It reuses the site's data and account
 * services as they are, so favourites and "learned" are the same lists on both designs.
 *
 * Styles are unencapsulated but every rule is scoped under .novo, so they reach the pages
 * inside without leaking into the rest of the app.
 */
@Component({
  selector: 'app-novo-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgTemplateOutlet, SigninPromptComponent, NovoIconComponent],
  encapsulation: ViewEncapsulation.None,
  styles: [`
    .novo { font-family: 'Geist', system-ui, sans-serif; color: #0f1115; background: #f6f7f9; }
    .novo .n-mono { font-family: 'Geist Mono', ui-monospace, monospace; }
    .novo .n-label { font-family: 'Geist Mono', ui-monospace, monospace; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #5f6778; }
    .novo a:focus-visible, .novo button:focus-visible, .novo input:focus-visible, .novo select:focus-visible, .novo [tabindex]:focus-visible {
      outline: 2px solid #2146d8; outline-offset: 2px;
    }
    @media print { .novo .no-print { display: none !important; } }
  `],
  template: `
    <div class="novo min-h-screen md:flex">

      <!-- Desktop: the sidebar is the whole navigation. -->
      <aside class="no-print hidden md:flex w-64 shrink-0 flex-col gap-1.5 px-3.5 py-5 bg-white border-r border-[#e3e6eb] sticky top-0 h-screen">
        <a routerLink="/novo" class="flex items-center gap-2.5 px-2.5 pt-1 pb-4 text-[#0f1115]">
          <span class="w-[30px] h-[30px] rounded-lg bg-[#0f1115] text-white flex items-center justify-center font-bold text-sm">A</span>
          <span class="text-base font-bold tracking-tight">Abadá Música</span>
        </a>

        <a routerLink="/novo/musicas" [queryParams]="{ buscar: 1 }"
           class="h-10 mb-3 px-3 rounded-[10px] border border-[#e3e6eb] bg-[#f6f7f9] flex items-center gap-2.5 text-sm text-[#5f6778] hover:border-[#c9ced8]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
          Buscar
        </a>

        @for (item of mainNav; track item.link) {
          <a [routerLink]="item.link" routerLinkActive="!bg-[#eef1fd] !text-[#2146d8] font-semibold" [routerLinkActiveOptions]="{ exact: item.exact }"
             class="flex items-center gap-3 min-h-10 px-3 rounded-[10px] text-sm font-medium text-[#434a5a] hover:bg-[#f6f7f9]">
            <app-novo-icon [name]="item.icon" />
            {{ item.label }}
            @if (item.count(); as n) {
              <span class="ml-auto n-mono text-xs text-[#5f6778]">{{ n }}</span>
            }
          </a>
        }

        <p class="n-label px-3 pt-5 pb-1">Suas listas</p>
        <a routerLink="/novo/musicas" [queryParams]="{ lista: 'favoritas' }"
           class="flex items-center gap-3 min-h-10 px-3 rounded-[10px] text-sm font-medium text-[#434a5a] hover:bg-[#f6f7f9]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>
          Fila de prática
          <span class="ml-auto n-mono text-xs text-[#5f6778]">{{ firebase.favorites().size }}</span>
        </a>
        <a routerLink="/novo/musicas" [queryParams]="{ lista: 'aprendidas' }"
           class="flex items-center gap-3 min-h-10 px-3 rounded-[10px] text-sm font-medium text-[#434a5a] hover:bg-[#f6f7f9]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>
          Aprendidas
          <span class="ml-auto n-mono text-xs text-[#5f6778]">{{ firebase.learnedSongs().size }}</span>
        </a>

        <div class="mt-auto flex flex-col gap-3">
          <a [href]="currentSiteUrl()" class="min-h-10 px-3 rounded-[10px] border border-dashed border-[#c9ced8] flex items-center justify-between text-sm font-medium text-[#434a5a] hover:border-[#2146d8] hover:text-[#2146d8]">
            Ver no site atual <span aria-hidden="true">↗</span>
          </a>
          <div class="pt-3 border-t border-[#e3e6eb]">
            <ng-container [ngTemplateOutlet]="account" />
          </div>
        </div>
      </aside>

      <!-- Phone: a slim top bar and a tab bar at the bottom, where thumbs are. -->
      <header class="no-print md:hidden sticky top-0 z-40 h-[60px] flex items-center gap-2.5 pl-5 pr-2 bg-white border-b border-[#e3e6eb]">
        <a routerLink="/novo" class="flex items-center gap-2.5 mr-auto text-[#0f1115]">
          <span class="w-7 h-7 rounded-lg bg-[#0f1115] text-white flex items-center justify-center font-bold text-[13px]">A</span>
          <span class="text-base font-bold">Abadá Música</span>
        </a>
        <a [href]="currentSiteUrl()" class="min-h-9 px-3 rounded-full border border-dashed border-[#c9ced8] flex items-center text-xs font-semibold text-[#434a5a]">Site atual ↗</a>
        <a routerLink="/novo/musicas" [queryParams]="{ buscar: 1 }" aria-label="Buscar" class="w-11 h-11 flex items-center justify-center text-[#0f1115]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
        </a>
      </header>

      <main class="flex-1 min-w-0 pb-24 md:pb-0">
        <router-outlet />
      </main>

      <nav aria-label="Principal" class="no-print md:hidden fixed inset-x-0 bottom-0 z-40 flex px-2 pt-1 pb-[max(env(safe-area-inset-bottom),12px)] bg-white border-t border-[#e3e6eb]">
        @for (item of tabNav; track item.label) {
          <a [routerLink]="item.link" [queryParams]="item.params" routerLinkActive="!text-[#2146d8]" [routerLinkActiveOptions]="{ exact: item.exact }"
             class="flex-1 min-h-14 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-[#5f6778]">
            <app-novo-icon [name]="item.icon" [size]="20" />
            {{ item.label }}
          </a>
        }
      </nav>

      <!-- The current site's own sign-in prompt: tapping a heart signed out opens it. -->
      <app-signin-prompt />

      @if (favorites.toast(); as toast) {
        <div role="status" class="no-print fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[75] flex items-center gap-3 pl-4 pr-2 py-1.5 rounded-xl bg-[#0f1115] text-white shadow-lg whitespace-nowrap">
          <span class="text-sm font-semibold">{{ toast.text === 'Salva nas favoritas' ? 'Na sua fila de prática' : (toast.text === 'Removida das favoritas' ? 'Fora da fila de prática' : toast.text) }}</span>
          @if (toast.linkToLibrary) {
            <a routerLink="/novo/musicas" [queryParams]="{ lista: 'favoritas' }" class="h-10 px-2 flex items-center text-sm font-bold text-[#9db1ff] hover:underline">Ver fila</a>
          }
        </div>
      }
    </div>

    <ng-template #account>
      @if (firebase.currentUser(); as user) {
        <div class="flex items-center gap-2.5 px-1">
          <span class="w-8 h-8 shrink-0 rounded-full bg-[#eef1fd] text-[#2146d8] flex items-center justify-center font-bold text-[13px]">{{ initial() }}</span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-semibold truncate">{{ user.displayName || user.email }}</span>
            <button type="button" (click)="firebase.signOut()" class="text-xs text-[#5f6778] hover:text-[#0f1115] hover:underline">Sair</button>
          </span>
        </div>
      } @else if (firebase.pendingSignedIn()) {
        <span aria-hidden="true" class="block h-10 rounded-[10px] bg-[#eef0f3] animate-pulse"></span>
      } @else {
        <a routerLink="/login" [queryParams]="{ returnUrl: router.url }"
           class="h-10 rounded-[10px] bg-[#2146d8] text-white text-sm font-semibold flex items-center justify-center">Entrar com Google</a>
      }
    </ng-template>
  `,
})
export class NovoShellComponent {
  readonly firebase = inject(FirebaseService);
  readonly favorites = inject(FavoritesService);
  readonly router = inject(Router);
  private readonly data = inject(DataService);
  private readonly document = inject(DOCUMENT);

  readonly mainNav = [
    { label: 'Início', link: '/novo', exact: true, icon: 'home', count: () => 0 },
    { label: 'Músicas', link: '/novo/musicas', exact: false, icon: 'list', count: () => this.data.songs().length },
    { label: 'Toques', link: '/novo/toques', exact: false, icon: 'drum', count: () => this.data.toques().length },
  ];

  readonly tabNav = [
    { label: 'Início', link: '/novo', params: {}, exact: true, icon: 'home' },
    { label: 'Músicas', link: '/novo/musicas', params: {}, exact: false, icon: 'list' },
    { label: 'Toques', link: '/novo/toques', params: {}, exact: false, icon: 'drum' },
    { label: 'Fila', link: '/novo/musicas', params: { lista: 'favoritas' }, exact: false, icon: 'heart' },
  ];

  readonly accountOpen = signal(false);

  private readonly url = toSignal(
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), map(e => e.urlAfterRedirects)),
    { initialValue: this.router.url },
  );

  /** The same page on the current site, for comparing the two designs side by side. */
  readonly currentSiteUrl = computed(() => this.url().split(/[?#]/)[0].replace(/^\/novo/, '') || '/');

  readonly initial = computed(() => {
    const u = this.firebase.currentUser();
    return (u?.displayName || u?.email || '?').trim().charAt(0).toUpperCase();
  });

  constructor() {
    // Loaded here rather than in index.html, so the current site never downloads them.
    if (!this.document.getElementById(FONTS_ID)) {
      const link = this.document.createElement('link');
      link.id = FONTS_ID;
      link.rel = 'stylesheet';
      link.href = FONTS_HREF;
      this.document.head.appendChild(link);
    }
    this.router.events.pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.accountOpen.set(false));
  }
}
