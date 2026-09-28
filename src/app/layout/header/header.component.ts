import { Component, ElementRef, HostListener, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { ThemeService } from '../../core/services/theme.service';
import { FirebaseService } from '../../core/services/firebase.service';
import { SearchBarComponent } from '../../shared/components/search-bar/search-bar.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, SearchBarComponent],
  template: `
    <header class="sticky top-0 z-50 backdrop-blur-md bg-white/90 dark:bg-stone-950/90 border-b border-stone-200/60 dark:border-stone-800/60">
      <div class="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">

        <!-- Logo -->
        <a routerLink="/classico" class="flex items-center shrink-0 py-2 -my-2">
          <span class="font-display text-lg font-bold text-capoeira-brown dark:text-capoeira-gold leading-tight">
            Abadá <span class="text-capoeira-gold dark:text-capoeira-cream">Música</span>
          </span>
        </a>

        <!-- Desktop nav -->
        <nav class="hidden md:flex items-center gap-1 text-sm font-medium ml-2">
          @for (link of navLinks; track link.path) {
            <a [routerLink]="link.path" routerLinkActive #a="routerLinkActive"
               [attr.aria-current]="a.isActive ? 'page' : null"
               class="px-3 py-1.5 rounded-md transition-colors"
               [class]="a.isActive ? activeClass : idleClass">
              {{ link.label }}
            </a>
          }
          <a routerLink="/classico/minhas" routerLinkActive #an="routerLinkActive"
             [attr.aria-current]="an.isActive ? 'page' : null"
             class="px-3 py-1.5 rounded-md transition-colors"
             [class]="an.isActive ? activeClass : idleClass">
            Minhas
          </a>
          @if (firebase.isAdmin()) {
            <a routerLink="/admin" routerLinkActive="text-capoeira-gold"
               class="px-3 py-1.5 rounded-md text-capoeira-gold hover:bg-capoeira-gold/10 transition-colors font-semibold">
              Admin
            </a>
          }
        </nav>

        <!-- Desktop search -->
        <div class="hidden md:block flex-1 max-w-sm ml-auto">
          <app-search-bar />
        </div>

        <!-- Dark mode toggle -->
        <button (click)="theme.toggle()"
          class="ml-auto md:ml-0 p-2 rounded-md text-stone-500 hover:text-capoeira-brown dark:hover:text-capoeira-gold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          aria-label="Alternar tema">
          @if (theme.isDark()) {
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
          } @else {
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path stroke-linecap="round" stroke-width="2" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          }
        </button>

        <!-- User area (desktop) -->
        <div class="relative hidden md:flex items-center">
          <!-- Every signed-in account gets the avatar, admin included. Admin used to be
               excluded here and was not covered by the Entrar branch either, so it had no
               sign-in indicator and no way to sign out. -->
          @if (firebase.currentUser()) {
            <!-- Avatar button -->
            <button (click)="toggleDropdown()"
              class="w-8 h-8 rounded-full bg-capoeira-gold text-capoeira-night text-sm font-bold flex items-center justify-center hover:bg-amber-400 transition-colors shadow-sm"
              [title]="firebase.currentUser()?.displayName || firebase.currentUser()?.email || ''">
              {{ userInitial() }}
            </button>

            <!-- Dropdown panel -->
            @if (dropdownOpen()) {
              <div class="absolute right-0 top-10 z-50 w-64 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-xl py-1">

                <!-- User info -->
                <div class="px-4 py-3 border-b border-stone-100 dark:border-stone-700">
                  <p class="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate">
                    {{ firebase.isAdmin() ? 'Administrador' : (firebase.currentUser()?.displayName || 'Usuário') }}
                  </p>
                  <p class="text-xs text-stone-400 truncate">{{ firebase.currentUser()?.email }}</p>
                </div>

                <!-- Admin gets a way into the panel. Membership is no longer sold, so
                     nobody else is offered a plan — but anyone still subscribed from before
                     keeps a way to manage or cancel it. -->
                @if (firebase.isAdmin()) {
                  <div class="px-4 py-3 border-b border-stone-100 dark:border-stone-700 flex items-center justify-between gap-2">
                    <span class="text-xs font-semibold text-capoeira-brown dark:text-capoeira-gold bg-capoeira-gold/15 px-2 py-0.5 rounded-full shrink-0">
                      Administrador
                    </span>
                    <a routerLink="/admin" (click)="closeDropdown()"
                      class="text-xs font-semibold text-capoeira-brown dark:text-capoeira-gold hover:underline transition-colors">
                      Abrir painel
                    </a>
                  </div>
                } @else if (firebase.membershipActive()) {
                  <div class="px-4 py-3 border-b border-stone-100 dark:border-stone-700 flex items-center justify-between gap-2">
                    <span class="text-xs text-stone-500 dark:text-stone-400">Assinatura antiga</span>
                    <button (click)="openPortal()" [disabled]="portalLoading()"
                      class="text-xs font-semibold text-capoeira-brown dark:text-capoeira-gold hover:underline disabled:opacity-50 transition-colors">
                      {{ portalLoading() ? 'Aguarde...' : 'Gerenciar assinatura' }}
                    </button>
                  </div>
                }

                <!-- Sign out -->
                <div class="px-4 py-2">
                  <button (click)="signOut(); closeDropdown()"
                    class="text-xs text-stone-400 hover:text-red-500 transition-colors w-full text-left">
                    Sair
                  </button>
                </div>

              </div>
            }
          }
          @if (!firebase.currentUser()) {
            <!-- Firebase loads a beat after the page. Until it has, someone who was
                 signed in last visit sees a placeholder, not an "Entrar" that is about
                 to turn into their avatar. -->
            @if (firebase.pendingSignedIn()) {
              <span aria-hidden="true" class="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-700 animate-pulse"></span>
            } @else {
              <a routerLink="/login" [queryParams]="loginParams()"
                 class="text-sm font-semibold px-3 py-1.5 rounded-lg border border-capoeira-gold text-capoeira-gold hover:bg-capoeira-gold/10 transition-colors">
                Entrar
              </a>
            }
          }
        </div>

        <!-- Search on a phone. The header search is desktop-only, so from Home, a song or
             Toques the only way to search used to be opening the menu. -->
        <button type="button" (click)="toggleMobileSearch()"
          class="md:hidden w-11 h-11 flex items-center justify-center rounded-md text-stone-500 hover:text-capoeira-brown dark:hover:text-capoeira-gold"
          aria-label="Buscar" aria-controls="mobile-search" [attr.aria-expanded]="mobileSearchOpen()">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke-width="2"/><path stroke-linecap="round" stroke-width="2" d="M21 21l-4-4"/>
          </svg>
        </button>

        <!-- Mobile menu button -->
        <button (click)="mobileOpen.set(!mobileOpen())" class="md:hidden w-11 h-11 flex items-center justify-center rounded-md text-stone-500"
          aria-label="Menu" aria-controls="mobile-drawer" [attr.aria-expanded]="mobileOpen()">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
      </div>

      @if (mobileSearchOpen()) {
        <div id="mobile-search" class="md:hidden px-4 pb-3">
          <app-search-bar />
        </div>
      }
    </header>

    <!-- Mobile drawer — always rendered so it can animate both ways; the inert attribute
         keeps its links out of the tab order while closed. -->
    <div class="md:hidden fixed inset-0 z-[60]"
      [class.pointer-events-none]="!mobileOpen()"
      [attr.inert]="mobileOpen() ? null : ''">

      <!-- Dimmed page. A button, not a div: tapping outside to close should also be
           reachable by keyboard, and a button brings focus and Enter/Space with it.
           The drawer is inert while closed, so this stays out of the tab order then. -->
      <button type="button" (click)="mobileOpen.set(false)" aria-label="Fechar menu"
        class="absolute inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity duration-200 cursor-default"
        [class]="mobileOpen() ? 'opacity-100' : 'opacity-0'"></button>

      <!-- Panel -->
      <div id="mobile-drawer" role="dialog" aria-modal="true" aria-label="Menu"
        (touchstart)="onDrawerTouchStart($event)" (touchend)="onDrawerTouchEnd($event)"
        class="absolute right-0 top-0 h-full w-[82%] max-w-xs flex flex-col bg-white dark:bg-stone-950 shadow-2xl transition-transform duration-200 ease-out"
        [class]="mobileOpen() ? 'translate-x-0' : 'translate-x-full'">

        <div class="h-14 shrink-0 flex items-center justify-between px-4 border-b border-stone-200/60 dark:border-stone-800/60">
          <span class="font-display text-sm font-bold text-capoeira-brown dark:text-capoeira-gold">Menu</span>
          <button (click)="mobileOpen.set(false)" aria-label="Fechar menu"
            class="p-2 -mr-2 rounded-md text-stone-400 hover:text-capoeira-brown dark:hover:text-capoeira-gold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          <app-search-bar />

          <!-- The four destinations live here on phones. Same list the header shows
               from md, so there is one definition of where you can go. -->
          <nav class="flex flex-col gap-1 pt-1">
            @for (link of navLinks; track link.path) {
              <a [routerLink]="link.path" routerLinkActive #d="routerLinkActive"
                 [attr.aria-current]="d.isActive ? 'page' : null"
                 (click)="mobileOpen.set(false)"
                 class="px-3 py-2.5 rounded-md text-sm transition-colors"
                 [class]="d.isActive ? drawerActiveClass : drawerIdleClass">
                {{ link.label }}
              </a>
            }
            <a routerLink="/classico/minhas" routerLinkActive #dn="routerLinkActive"
               [attr.aria-current]="dn.isActive ? 'page' : null"
               (click)="mobileOpen.set(false)"
               class="px-3 py-2.5 rounded-md text-sm transition-colors"
               [class]="dn.isActive ? drawerActiveClass : drawerIdleClass">
              Minhas
            </a>
            @if (firebase.isAdmin()) {
              <a routerLink="/admin" (click)="mobileOpen.set(false)"
                 class="px-3 py-2 rounded-md text-capoeira-gold hover:bg-capoeira-gold/10 text-sm font-semibold">
                Admin
              </a>
            }
            @if (firebase.currentUser()) {
              <!-- User info row -->
              <div class="flex items-center gap-2 px-3 py-2 border-t border-stone-100 dark:border-stone-700 mt-1 pt-2">
                <span class="w-7 h-7 rounded-full bg-capoeira-gold/20 text-capoeira-brown dark:text-capoeira-gold text-xs font-bold flex items-center justify-center shrink-0">
                  {{ userInitial() }}
                </span>
                <span class="text-sm text-stone-600 dark:text-stone-300 truncate">
                  {{ firebase.isAdmin() ? 'Administrador' : (firebase.currentUser()?.displayName || firebase.currentUser()?.email) }}
                </span>
              </div>
              <!-- Membership is no longer sold; an existing subscriber can still manage it. -->
              @if (!firebase.isAdmin() && firebase.membershipActive()) {
                <div class="flex items-center justify-between px-3 py-1">
                  <span class="text-xs text-stone-500 dark:text-stone-400">Assinatura antiga</span>
                  <button (click)="openPortal(); mobileOpen.set(false)" [disabled]="portalLoading()"
                    class="text-xs font-semibold text-capoeira-brown dark:text-capoeira-gold hover:underline disabled:opacity-50">
                    {{ portalLoading() ? 'Aguarde...' : 'Gerenciar assinatura' }}
                  </button>
                </div>
              }
              <!-- Sign out -->
              <button (click)="signOut(); mobileOpen.set(false)"
                class="px-3 py-2 text-xs text-stone-400 hover:text-red-500 transition-colors text-left w-full">
                Sair
              </button>
            }
            @if (!firebase.currentUser() && !firebase.pendingSignedIn()) {
              <a routerLink="/login" [queryParams]="loginParams()" (click)="mobileOpen.set(false)"
                 class="px-3 py-3 rounded-md text-center text-capoeira-gold border border-capoeira-gold hover:bg-capoeira-gold/10 text-sm font-semibold">
                Entrar
              </a>
            }
          </nav>
        </div>
      </div>
    </div>
  `,
})
export class HeaderComponent {
  theme = inject(ThemeService);
  firebase = inject(FirebaseService);
  private el = inject(ElementRef);
  private router = inject(Router);

  readonly mobileSearchOpen = signal(false);

  /** Brings you back to the page you were on after signing in. */
  loginParams(): Record<string, string> {
    const url = this.router.url;
    return url.startsWith('/login') ? {} : { returnUrl: url };
  }

  toggleMobileSearch(): void {
    this.mobileSearchOpen.update(open => !open);
    if (this.mobileSearchOpen()) {
      // Straight into typing: the row exists after this change detection pass.
      setTimeout(() => (this.el.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#mobile-search input')?.focus());
    }
  }

  mobileOpen = signal(false);
  dropdownOpen = signal(false);
  portalLoading = signal(false);

  // Vídeos is deliberately absent: a video belongs to its toque and plays on that
  // toque's page, which is where people look for it. The /videos index still exists
  // as a way to see them all at once, linked from the footer rather than from here.
  navLinks = [
    { path: '/classico/musicas', label: 'Músicas' },
    { path: '/classico/toques', label: 'Toques' },
  ];

  // Swapped, not stacked: handing "text-capoeira-gold" to routerLinkActive left two
  // text-colour utilities of equal specificity on the link, and the idle grey won on
  // emit order — so the current page was never actually marked.
  readonly activeClass = 'text-capoeira-gold font-semibold';
  readonly idleClass = 'text-stone-600 dark:text-stone-300 hover:text-capoeira-brown dark:hover:text-capoeira-cream hover:bg-stone-100 dark:hover:bg-stone-800';

  // Same swap in the drawer, where rows are taller and the active one gets a tint so
  // the current page is obvious on a phone.
  readonly drawerActiveClass = 'bg-capoeira-gold/10 text-capoeira-brown dark:text-capoeira-gold font-semibold';
  readonly drawerIdleClass = 'text-stone-600 dark:text-stone-300 font-medium hover:bg-stone-100 dark:hover:bg-stone-800';

  /** Horizontal start of a drag on the drawer, for swipe-to-close. */
  private touchStartX: number | null = null;

  constructor() {
    // Keep the page behind the drawer from scrolling while it's open.
    effect(() => {
      document.body.style.overflow = this.mobileOpen() ? 'hidden' : '';
    });
    // Picking a search result navigates; fold the phone search row away when it does.
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.mobileSearchOpen.set(false));
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.el.nativeElement.contains(event.target)) {
      this.dropdownOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.mobileOpen.set(false);
    this.dropdownOpen.set(false);
  }

  onDrawerTouchStart(event: TouchEvent) {
    this.touchStartX = event.changedTouches[0]?.clientX ?? null;
  }

  onDrawerTouchEnd(event: TouchEvent) {
    const startX = this.touchStartX;
    this.touchStartX = null;
    if (startX === null) return;
    const deltaX = (event.changedTouches[0]?.clientX ?? startX) - startX;
    // A swipe to the right pushes the panel back off screen.
    if (deltaX > 60) this.mobileOpen.set(false);
  }

  toggleDropdown() {
    this.dropdownOpen.update(v => !v);
  }

  closeDropdown() {
    this.dropdownOpen.set(false);
  }

  userInitial(): string {
    const user = this.firebase.currentUser();
    const name = user?.displayName || user?.email || '?';
    return name.charAt(0).toUpperCase();
  }

  async signOut() {
    await this.firebase.signOut();
  }

  async openPortal() {
    const user = this.firebase.currentUser();
    if (!user) return;
    this.portalLoading.set(true);
    try {
      const res = await fetch('/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      this.portalLoading.set(false);
    }
  }
}
