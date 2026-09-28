import { Component, DOCUMENT, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { FirebaseService } from '../../core/services/firebase.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { SigninPromptComponent } from '../../shared/components/signin-prompt/signin-prompt.component';
import { NovoThemeService } from './novo-theme.service';
import { NovoPlayerService } from './novo-player.service';
import { NovoPlayerComponent } from './novo-player.component';
import { NovoIconComponent } from './novo-ui';

const FONTS_ID = 'novo-design-fonts';
const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Unbounded:wght@500;600;700&family=Figtree:wght@400;500;600;700;800&display=swap';

/**
 * The frame for the new design ("Abadá") at /novo. It sits beside the current site's shell,
 * never inside it, and reuses the site's data and account services as they are, so
 * Curtidas and Aprendidas are the same lists on both designs.
 *
 * Colours are CSS variables set on the root for light or dark. Styles are unencapsulated
 * but every rule is scoped under .novo, so nothing leaks into the current site.
 */
@Component({
  selector: 'app-novo-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SigninPromptComponent, NovoPlayerComponent, NovoIconComponent],
  encapsulation: ViewEncapsulation.None,
  styles: [`
    .novo {
      --n-bg: #f6f5f1; --n-surf: #ffffff; --n-raise: #efede7; --n-line: #e2dfd6;
      --n-tx: #15161a; --n-tx2: #50535c; --n-tx3: #6e717b; --n-acc: #ffc21a; --n-acc-tx: #8a6400;
      font-family: 'Figtree', system-ui, sans-serif; color: var(--n-tx); background: var(--n-bg); color-scheme: light;
    }
    .novo.novo-dark {
      --n-bg: #101114; --n-surf: #181a1f; --n-raise: #22252c; --n-line: #2d3038;
      --n-tx: #f4f3ef; --n-tx2: #b4b6bd; --n-tx3: #8f929b; --n-acc: #ffc21a; --n-acc-tx: #ffc21a;
      color-scheme: dark;
    }
    .novo .n-disp { font-family: 'Unbounded', system-ui, sans-serif; }
    .novo a { color: inherit; }
    .novo a:hover { text-decoration: underline; }
    .novo a:focus-visible, .novo button:focus-visible, .novo input:focus-visible {
      outline: 2px solid var(--n-acc); outline-offset: 2px;
    }
    @media print { .novo .no-print { display: none !important; } }
    @media (prefers-reduced-motion: reduce) { .novo * { transition: none !important; } }
  `],
  template: `
    <div class="novo min-h-screen flex flex-col" [class.novo-dark]="theme.dark()">

      <header class="no-print sticky top-0 z-30 bg-[var(--n-surf)] border-b border-[var(--n-line)]">
        <div class="max-w-[1440px] mx-auto h-[60px] md:h-[72px] flex items-center gap-4 md:gap-9 pl-[18px] pr-2 md:px-10">
          <a routerLink="/novo" class="min-h-11 inline-flex items-center n-disp font-bold text-[17px] md:text-xl tracking-[-0.03em] hover:no-underline">abadá<span class="text-[var(--n-acc)]">.</span>música</a>

          <nav aria-label="Principal" class="hidden md:flex gap-7 h-full">
            @for (item of nav; track item.link) {
              <a [routerLink]="item.link" routerLinkActive="!text-[var(--n-tx)] !border-[var(--n-acc)]" [routerLinkActiveOptions]="{ exact: item.exact }"
                 class="h-full inline-flex items-center text-[15px] font-bold text-[var(--n-tx2)] border-b-[3px] border-transparent box-border hover:no-underline hover:text-[var(--n-tx)]">{{ item.label }}</a>
            }
          </nav>

          <form role="search" (submit)="search($event, q.value)" class="hidden md:flex ml-auto">
            <label class="w-[300px] h-[42px] px-3.5 rounded-[10px] bg-[var(--n-raise)] flex items-center gap-2.5 text-[var(--n-tx3)]">
              <app-novo-icon name="search" [size]="17" />
              <span class="sr-only">Buscar</span>
              <input #q id="novo-search" type="search" placeholder="Cantiga, verso ou toque" class="flex-1 min-w-0 bg-transparent border-0 outline-none text-[15px] text-[var(--n-tx)] placeholder:text-[var(--n-tx3)]" />
            </label>
          </form>

          <div class="hidden md:flex items-center gap-2 text-[13px] font-semibold text-[var(--n-tx2)]">
            <span id="novo-theme-label">Escuro</span>
            <button type="button" role="switch" (click)="theme.toggle()" [attr.aria-checked]="theme.dark()" aria-labelledby="novo-theme-label"
              class="relative w-11 h-[26px] rounded-full transition-colors" [style.background]="theme.dark() ? 'var(--n-acc)' : 'var(--n-line)'">
              <span class="absolute top-[3px] w-5 h-5 rounded-full transition-[left]" [style.left.px]="theme.dark() ? 21 : 3" [style.background]="theme.dark() ? '#1a1400' : '#ffffff'"></span>
            </button>
          </div>

          <a [href]="currentSiteUrl()" class="hidden lg:inline-flex h-9 px-3 rounded-full border border-dashed border-[var(--n-line)] items-center text-[13px] font-semibold text-[var(--n-tx2)] whitespace-nowrap">Site atual ↗</a>

          <div class="relative ml-auto md:ml-0 flex items-center gap-1">
            <button type="button" (click)="theme.toggle()" class="md:hidden w-11 h-11 rounded-full flex items-center justify-center text-[var(--n-tx)]" [attr.aria-label]="theme.dark() ? 'Usar tema claro' : 'Usar tema escuro'">
              <app-novo-icon [name]="theme.dark() ? 'sun' : 'moon'" [size]="20" />
            </button>
            <a routerLink="/novo/cantigas" [queryParams]="{ buscar: 1 }" class="md:hidden w-11 h-11 rounded-full flex items-center justify-center text-[var(--n-tx)]" aria-label="Buscar"><app-novo-icon name="search" [size]="21" /></a>
            @if (firebase.currentUser(); as user) {
              <button type="button" (click)="accountOpen.set(!accountOpen())" [attr.aria-expanded]="accountOpen()" [attr.aria-label]="'Conta: ' + (user.displayName || user.email)"
                class="w-[38px] h-[38px] rounded-full bg-[var(--n-acc)] text-[#1a1400] font-extrabold flex items-center justify-center">{{ initial() }}</button>
              @if (accountOpen()) {
                <div class="absolute right-0 top-12 w-64 p-4 rounded-2xl bg-[var(--n-surf)] border border-[var(--n-line)] shadow-lg flex flex-col gap-3 z-50">
                  <div class="min-w-0"><p class="m-0 font-bold truncate">{{ user.displayName || 'Sua conta' }}</p><p class="m-0 text-sm text-[var(--n-tx2)] truncate">{{ user.email }}</p></div>
                  <a [href]="currentSiteUrl()" class="lg:hidden text-sm font-semibold">Ver no site atual ↗</a>
                  <button type="button" (click)="signOut()" class="h-10 rounded-xl border border-[var(--n-line)] font-bold text-sm">Sair</button>
                </div>
              }
            } @else if (firebase.pendingSignedIn()) {
              <span aria-hidden="true" class="block w-[38px] h-[38px] rounded-full bg-[var(--n-raise)] animate-pulse"></span>
            } @else {
              <a routerLink="/login" [queryParams]="{ returnUrl: router.url }" class="h-10 px-4 rounded-xl bg-[var(--n-acc)] text-[#1a1400] text-sm font-extrabold inline-flex items-center hover:no-underline">Entrar</a>
            }
          </div>
        </div>
      </header>

      <main class="flex-1 min-w-0" [class]="player.current() ? 'pb-[180px] md:pb-28' : 'pb-24 md:pb-10'">
        <router-outlet />
      </main>

      <footer class="no-print hidden md:block border-t border-[var(--n-line)]" [class.md:mb-24]="!!player.current()">
        <div class="max-w-[1440px] mx-auto px-10 py-6 flex items-center justify-between text-sm text-[var(--n-tx2)]">
          <span><span class="n-disp font-bold text-[var(--n-tx)]">abadá.música</span> · novo design, em teste</span>
          <a [href]="currentSiteUrl()" class="font-semibold text-[var(--n-acc-tx)]">Ver esta página no site atual</a>
        </div>
      </footer>

      <nav aria-label="Principal" class="no-print md:hidden fixed inset-x-0 bottom-0 z-40 flex px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),14px)] bg-[var(--n-surf)] border-t border-[var(--n-line)]">
        @for (item of tabs; track item.label) {
          <a [routerLink]="item.link" routerLinkActive="!text-[var(--n-acc-tx)]" [routerLinkActiveOptions]="{ exact: item.exact }"
             class="flex-1 min-h-[52px] flex flex-col items-center justify-center gap-1 text-[11px] font-bold text-[var(--n-tx3)] hover:no-underline">
            <app-novo-icon [name]="item.icon" [size]="22" />{{ item.label }}
          </a>
        }
      </nav>

      <app-novo-player />

      <!-- The current site's sign-in prompt: tapping a heart signed out opens it. -->
      <app-signin-prompt />

      @if (favorites.toast(); as toast) {
        <div role="status" class="no-print fixed bottom-[190px] md:bottom-32 left-1/2 -translate-x-1/2 z-[75] flex items-center gap-3 pl-4 pr-2 py-1.5 rounded-xl bg-[#15161a] text-white shadow-lg whitespace-nowrap">
          <span class="text-sm font-semibold">{{ toastText(toast.text) }}</span>
          @if (toast.linkToLibrary) {
            <a routerLink="/novo/curtidas" class="h-10 px-2 flex items-center text-sm font-bold text-[#ffc21a]">Ver curtidas</a>
          }
        </div>
      }
    </div>
  `,
})
export class NovoShellComponent {
  readonly firebase = inject(FirebaseService);
  readonly favorites = inject(FavoritesService);
  readonly theme = inject(NovoThemeService);
  readonly player = inject(NovoPlayerService);
  readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  readonly nav = [
    { label: 'Início', link: '/novo', exact: true },
    { label: 'Toques', link: '/novo/toques', exact: false },
    { label: 'Cantigas', link: '/novo/cantigas', exact: false },
    { label: 'Curtidas', link: '/novo/curtidas', exact: false },
  ];
  readonly tabs = [
    { label: 'Início', link: '/novo', exact: true, icon: 'home' },
    { label: 'Toques', link: '/novo/toques', exact: false, icon: 'drum' },
    { label: 'Cantigas', link: '/novo/cantigas', exact: false, icon: 'note' },
    { label: 'Curtidas', link: '/novo/curtidas', exact: false, icon: 'heart' },
  ];

  readonly accountOpen = signal(false);

  private readonly url = toSignal(
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), map(e => e.urlAfterRedirects)),
    { initialValue: this.router.url },
  );

  /** The same page on the current site, for comparing the two designs. */
  readonly currentSiteUrl = computed(() => {
    const path = this.url().split(/[?#]/)[0].replace(/^\/novo/, '');
    return path.replace(/^\/cantigas/, '/musicas').replace(/^\/curtidas/, '/minhas') || '/';
  });

  readonly initial = computed(() => {
    const u = this.firebase.currentUser();
    return (u?.displayName || u?.email || '?').trim().charAt(0).toUpperCase();
  });

  constructor() {
    // Loaded here rather than in index.html, so the current site never downloads them.
    if (!this.document.getElementById(FONTS_ID)) {
      const link = this.document.createElement('link');
      link.id = FONTS_ID; link.rel = 'stylesheet'; link.href = FONTS_HREF;
      this.document.head.appendChild(link);
    }
    this.router.events.pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.accountOpen.set(false));
  }

  /** The shared favourites service speaks of "favoritas"; this design calls them curtidas. */
  toastText(text: string): string {
    if (text === 'Salva nas favoritas') return 'Salva nas curtidas';
    if (text === 'Removida das favoritas') return 'Removida das curtidas';
    return text;
  }

  search(event: Event, value: string): void {
    event.preventDefault();
    const q = value.trim();
    void this.router.navigate(['/novo/cantigas'], { queryParams: q ? { q } : {} });
  }

  async signOut(): Promise<void> {
    await this.firebase.signOut();
    this.accountOpen.set(false);
  }
}
