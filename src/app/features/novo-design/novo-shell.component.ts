import { Component, DOCUMENT, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { FirebaseService } from '../../core/services/firebase.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { NovoThemeService } from './novo-theme.service';
import { NovoPlayerService } from './novo-player.service';
import { NovoPlayerComponent } from './novo-player.component';
import { NovoIconComponent } from './novo-ui';
import { NovoLangService } from './novo-lang.service';

const FONTS_ID = 'novo-design-fonts';
const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Unbounded:wght@500;600;700&family=Figtree:wght@400;500;600;700;800&display=swap';

/**
 * The frame for the main site ("Abadá" design), in English at / and Portuguese at /pt. It sits beside the classic shell (/classico),
 * never inside it, and reuses the site's data and account services as they are, so
 * Curtidas and Aprendidas are the same lists on both designs.
 *
 * Colours are CSS variables set on the root for light or dark. Styles are unencapsulated
 * but every rule is scoped under .novo, so nothing leaks into the current site.
 */
@Component({
  selector: 'app-novo-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NovoPlayerComponent, NovoIconComponent],
  host: { '(document:keydown)': 'onKey($event)' },
  encapsulation: ViewEncapsulation.None,
  styles: [`
    .novo {
      /* Light is the default. Every text colour here is at least 6:1 on the page. */
      --n-bg: #f7f6f2; --n-surf: #ffffff; --n-raise: #eeece6; --n-line: #dcd8ce;
      --n-tx: #101114; --n-tx2: #3b3e46; --n-tx3: #5a5d66; --n-acc: #ffc21a; --n-acc-tx: #6b4d00; --n-ok: #0a7550;
      font-family: 'Figtree', system-ui, sans-serif; color: var(--n-tx); background: var(--n-bg); color-scheme: light;
    }
    .novo.novo-dark {
      --n-bg: #101114; --n-surf: #181a1f; --n-raise: #22252c; --n-line: #2d3038;
      --n-tx: #f4f3ef; --n-tx2: #b4b6bd; --n-tx3: #8f929b; --n-acc: #ffc21a; --n-acc-tx: #ffc21a; --n-ok: #3fcf8e;
      color-scheme: dark;
    }
    .novo .n-disp { font-family: 'Unbounded', system-ui, sans-serif; }
    /* :where() keeps these at zero specificity, so a link's own colour class (white text on
       a toque card, the selected tab) always wins over "inherit". */
    :where(.novo) a { color: inherit; }
    :where(.novo) a:hover { text-decoration: underline; }
    .novo a:focus-visible, .novo button:focus-visible, .novo input:focus-visible {
      outline: 2px solid var(--n-acc); outline-offset: 2px;
    }
    @media print { .novo .no-print { display: none !important; } }
    @media (prefers-reduced-motion: reduce) { .novo * { transition: none !important; } }
  `],
  template: `
    <div class="novo min-h-screen flex flex-col" [class.novo-dark]="theme.dark()">

      <header class="no-print sticky top-0 z-30 bg-[var(--n-surf)] border-b border-[var(--n-line)]">
        <div class="max-w-[1440px] mx-auto h-[60px] md:h-[72px] flex items-center gap-2 md:gap-9 pl-4 pr-2 md:px-10">
          <a [routerLink]="L.to('/')" class="min-h-11 inline-flex items-center n-disp font-bold text-[15px] min-[380px]:text-[17px] md:text-xl tracking-[-0.03em] hover:no-underline">abadá<span class="text-[var(--n-acc-tx)]">.</span>música</a>

          <nav [attr.aria-label]="L.s().navMain" class="hidden md:flex gap-7 h-full">
            @for (item of nav(); track item.link) {
              <a [routerLink]="item.link" routerLinkActive="!text-[var(--n-tx)] !border-[var(--n-acc)]" [routerLinkActiveOptions]="{ exact: item.exact }"
                 class="h-full inline-flex items-center text-[15px] font-bold text-[var(--n-tx2)] border-b-[3px] border-transparent box-border hover:no-underline hover:text-[var(--n-tx)]">{{ item.label }}</a>
            }
          </nav>

          <form role="search" (submit)="search($event, q.value)" class="hidden md:flex ml-auto">
            <label class="w-[300px] h-[42px] px-3.5 rounded-[10px] bg-[var(--n-raise)] flex items-center gap-2.5 text-[var(--n-tx3)]">
              <app-novo-icon name="search" [size]="17" />
              <span class="sr-only">{{ L.s().searchLabel }}</span>
              <input #q id="novo-search" type="search" [placeholder]="L.s().searchPlaceholder" class="flex-1 min-w-0 bg-transparent border-0 outline-none text-[15px] text-[var(--n-tx)] placeholder:text-[var(--n-tx3)]" />
            </label>
          </form>

          <div class="hidden md:flex items-center gap-2 text-[13px] font-semibold text-[var(--n-tx2)]">
            <span id="novo-theme-label">{{ L.s().themeDark }}</span>
            <button type="button" role="switch" (click)="theme.toggle()" [attr.aria-checked]="theme.dark()" aria-labelledby="novo-theme-label"
              class="relative w-11 h-[26px] rounded-full transition-colors" [style.background]="theme.dark() ? 'var(--n-acc)' : 'var(--n-line)'">
              <span class="absolute top-[3px] w-5 h-5 rounded-full transition-[left]" [style.left.px]="theme.dark() ? 21 : 3" [style.background]="theme.dark() ? '#1a1400' : '#ffffff'"></span>
            </button>
          </div>

          <a [href]="L.otherUrl()" [attr.hreflang]="L.lang() === 'en' ? 'pt-BR' : 'en'" (click)="switchLang($event)"
             class="hidden md:flex items-center gap-2 text-[13px] font-semibold text-[var(--n-tx2)] hover:no-underline" [attr.aria-label]="L.s().switchHint">
            <span lang="pt-BR">Português</span>
            <span aria-hidden="true" class="relative w-11 h-[26px] rounded-full transition-colors" [style.background]="L.lang() === 'pt' ? 'var(--n-acc)' : 'var(--n-line)'">
              <span class="absolute top-[3px] w-5 h-5 rounded-full transition-[left]" [style.left.px]="L.lang() === 'pt' ? 21 : 3" [style.background]="L.lang() === 'pt' ? '#1a1400' : '#ffffff'"></span>
            </span>
          </a>

          <div class="relative ml-auto md:ml-0 flex items-center gap-0.5 min-[380px]:gap-1">
            <button type="button" (click)="theme.toggle()" class="md:hidden w-10 h-10 rounded-full flex items-center justify-center text-[var(--n-tx)]" [attr.aria-label]="theme.dark() ? L.s().useLight : L.s().useDark">
              <app-novo-icon [name]="theme.dark() ? 'sun' : 'moon'" [size]="20" />
            </button>
            <a [href]="L.otherUrl()" (click)="switchLang($event)" [attr.hreflang]="L.lang() === 'en' ? 'pt-BR' : 'en'" [attr.aria-label]="L.s().switchHint"
               class="md:hidden h-10 min-w-10 px-2 rounded-full border border-[var(--n-line)] flex items-center justify-center text-[13px] font-extrabold text-[var(--n-tx)] hover:no-underline">{{ L.s().switchToShort }}</a>
            <a [routerLink]="L.to('/cantigas')" [queryParams]="{ buscar: 1 }" class="md:hidden w-10 h-10 rounded-full flex items-center justify-center text-[var(--n-tx)]" [attr.aria-label]="L.s().searchLabel"><app-novo-icon name="search" [size]="21" /></a>
            @if (firebase.currentUser(); as user) {
              <button type="button" (click)="accountOpen.set(!accountOpen())" [attr.aria-expanded]="accountOpen()" [attr.aria-label]="L.s().account + ': ' + (user.displayName || user.email)"
                class="w-[38px] h-[38px] rounded-full bg-[var(--n-acc)] text-[#1a1400] font-extrabold flex items-center justify-center">{{ initial() }}</button>
              @if (accountOpen()) {
                <div class="absolute right-0 top-12 w-64 p-4 rounded-2xl bg-[var(--n-surf)] border border-[var(--n-line)] shadow-lg flex flex-col gap-3 z-50">
                  <div class="min-w-0"><p class="m-0 font-bold truncate">{{ user.displayName || L.s().yourAccount }}</p><p class="m-0 text-sm text-[var(--n-tx2)] truncate">{{ user.email }}</p></div>
                  <a [href]="classicUrl()" class="text-sm font-semibold">{{ L.s().classicLong }} ↗</a>
                  <button type="button" (click)="signOut()" class="h-10 rounded-xl border border-[var(--n-line)] font-bold text-sm">{{ L.s().signOut }}</button>
                </div>
              }
            } @else if (firebase.pendingSignedIn()) {
              <span aria-hidden="true" class="block w-[38px] h-[38px] rounded-full bg-[var(--n-raise)] animate-pulse"></span>
            } @else {
              <a [routerLink]="L.to('/login')" [queryParams]="{ returnUrl: router.url }" class="hidden md:inline-flex h-10 px-4 rounded-xl bg-[var(--n-acc)] text-[#1a1400] text-sm font-extrabold items-center hover:no-underline">{{ L.s().signIn }}</a>
              <!-- Phones: an icon, so the header fits with the language and theme buttons. -->
              <a [routerLink]="L.to('/login')" [queryParams]="{ returnUrl: router.url }" [attr.aria-label]="L.s().signIn"
                 class="md:hidden w-10 h-10 rounded-full bg-[var(--n-acc)] text-[#1a1400] flex items-center justify-center hover:no-underline"><app-novo-icon name="user" [size]="20" /></a>
            }
          </div>
        </div>
      </header>

      <main class="flex-1 min-w-0" [class]="bottomRoom()">
        <router-outlet />
      </main>

      <footer class="no-print hidden md:block border-t border-[var(--n-line)]" [class.md:mb-24]="!!player.current()">
        <div class="max-w-[1440px] mx-auto px-10 py-6 flex items-center justify-between text-sm text-[var(--n-tx2)]">
          <span><span class="n-disp font-bold text-[var(--n-tx)]">abadá.música</span> · {{ L.s().footerNote }}</span>
          <span class="flex items-center gap-5">
            <a [href]="L.otherUrl()" (click)="switchLang($event)" [attr.hreflang]="L.lang() === 'en' ? 'pt-BR' : 'en'" class="font-semibold">{{ L.s().switchHint }}</a>
            <a [href]="classicUrl()" class="font-semibold text-[var(--n-acc-tx)]">{{ L.s().classicLong }}</a>
          </span>
        </div>
      </footer>

      <nav [attr.aria-label]="L.s().navMain" class="no-print md:hidden fixed inset-x-0 bottom-0 z-40 flex px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),14px)] bg-[var(--n-surf)] border-t border-[var(--n-line)]">
        @for (item of tabs(); track item.link) {
          <a [routerLink]="item.link" routerLinkActive="!text-[var(--n-acc-tx)]" [routerLinkActiveOptions]="{ exact: item.exact }"
             class="flex-1 min-h-[52px] flex flex-col items-center justify-center gap-1 text-[11px] font-bold text-[var(--n-tx3)] hover:no-underline">
            <app-novo-icon [name]="item.icon" [size]="22" />{{ item.label }}
          </a>
        }
      </nav>

      <app-novo-player />

      <!-- Tapping a heart while signed out: the shared favourites action opens this. -->
      @if (favorites.promptOpen()) {
        <div class="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
          <button type="button" [attr.aria-label]="L.s().close" (click)="favorites.closePrompt()" class="absolute inset-0 bg-black/55 cursor-default"></button>
          <section role="dialog" aria-modal="true" aria-labelledby="novo-signin-title" tabindex="-1" (keydown.escape)="favorites.closePrompt()"
            class="relative w-full sm:max-w-sm bg-[var(--n-surf)] text-[var(--n-tx)] rounded-t-3xl sm:rounded-3xl px-6 pt-3 pb-[max(env(safe-area-inset-bottom),28px)] sm:pt-7 shadow-2xl flex flex-col items-center gap-4 text-center">
            <span aria-hidden="true" class="sm:hidden w-10 h-1.5 rounded-full bg-[var(--n-line)]"></span>
            <span aria-hidden="true" class="mt-2 sm:mt-0 w-14 h-14 rounded-2xl bg-[#4338ca] text-white flex items-center justify-center"><app-novo-icon name="heart" [size]="26" [filled]="true" /></span>
            <h2 id="novo-signin-title" class="m-0 n-disp text-[22px] font-bold tracking-[-0.03em]">{{ L.s().keepLiked }}</h2>
            <p class="m-0 text-[15px] leading-relaxed text-[var(--n-tx2)]">{{ L.s().keepLikedBody }}</p>
            <div class="self-stretch flex flex-col gap-2 mt-1">
              <a [routerLink]="L.to('/login')" [queryParams]="{ returnUrl: router.url }" (click)="favorites.closePrompt()"
                class="h-12 rounded-xl bg-[var(--n-acc)] text-[#1a1400] font-extrabold flex items-center justify-center hover:no-underline">{{ L.s().signInGoogle }}</a>
              <button type="button" (click)="favorites.closePrompt()" class="h-12 rounded-xl font-bold text-[var(--n-tx2)] hover:bg-[var(--n-raise)]">{{ L.s().notNow }}</button>
            </div>
          </section>
        </div>
      }

      @if (favorites.toast(); as toast) {
        <div role="status" class="no-print fixed bottom-[190px] md:bottom-32 left-1/2 -translate-x-1/2 z-[75] flex items-center gap-3 pl-4 pr-2 py-1.5 rounded-xl bg-[#15161a] text-white shadow-lg whitespace-nowrap">
          <span class="text-sm font-semibold">{{ toastText(toast.text) }}</span>
          @if (toast.linkToLibrary) {
            <a [routerLink]="L.to('/curtidas')" class="h-10 px-2 flex items-center text-sm font-bold text-[#ffc21a]">{{ L.s().seeLiked }}</a>
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

  readonly L = inject(NovoLangService);

  readonly nav = computed(() => [
    { label: this.L.s().navHome, link: this.L.to('/'), exact: true },
    { label: this.L.s().navToques, link: this.L.to('/toques'), exact: false },
    { label: this.L.s().navSongs, link: this.L.to('/cantigas'), exact: false },
    { label: this.L.s().navLiked, link: this.L.to('/curtidas'), exact: false },
  ]);
  readonly tabs = computed(() => [
    { label: this.L.s().navHome, link: this.L.to('/'), exact: true, icon: 'home' },
    { label: this.L.s().navToques, link: this.L.to('/toques'), exact: false, icon: 'drum' },
    { label: this.L.s().navSongs, link: this.L.to('/cantigas'), exact: false, icon: 'note' },
    { label: this.L.s().navLiked, link: this.L.to('/curtidas'), exact: false, icon: 'heart' },
  ]);

  readonly accountOpen = signal(false);

  /** The same page on the classic design, which lives at /classico during the transition. */
  readonly classicUrl = computed(() => {
    const path = this.L.bare().replace(/^\/cantigas/, '/musicas').replace(/^\/curtidas/, '/minhas').replace(/^\/login$/, '/');
    return path === '/' ? '/classico' : '/classico' + path;
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

  /** Space for the player at the bottom of every page, so the end of a page can scroll clear of it. */
  readonly bottomRoom = computed(() => {
    if (!this.player.current()) return 'pb-24 md:pb-10';
    return this.player.videoShown() ? 'pb-[370px] md:pb-[330px]' : 'pb-[180px] md:pb-28';
  });

  /** Space bar plays and pauses, as in music apps, unless the visitor is typing or on a control. */
  onKey(e: KeyboardEvent): void {
    if (e.key !== ' ' || e.repeat || e.ctrlKey || e.metaKey || e.altKey || !this.player.current()?.videoId) return;
    const el = e.target as HTMLElement | null;
    if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(el.tagName))) return;
    if (this.favorites.promptOpen()) return;
    e.preventDefault();
    this.player.toggle();
  }

  /** The shared favourites service speaks Portuguese ("favoritas"); show its messages in this design's words and language. */
  toastText(text: string): string {
    const d = this.L.s();
    if (text === 'Salva nas favoritas') return d.savedToLiked;
    if (text === 'Removida das favoritas') return d.removedFromLiked;
    if (text.startsWith('Não foi possível')) return d.couldNotSave;
    return text;
  }

  /** The language switch is a real link (so search engines find the other language), handled in-app so the player keeps going. */
  switchLang(event: MouseEvent): void {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    void this.router.navigateByUrl(this.L.otherUrl());
  }

  search(event: Event, value: string): void {
    event.preventDefault();
    const q = value.trim();
    void this.router.navigate([this.L.to('/cantigas')], { queryParams: q ? { q } : {} });
  }

  async signOut(): Promise<void> {
    await this.firebase.signOut();
    this.accountOpen.set(false);
  }
}
