import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
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
      <div class="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">

        <!-- Logo -->
        <a routerLink="/" class="flex items-center shrink-0">
          <span class="font-display text-lg font-bold text-capoeira-brown dark:text-capoeira-gold leading-tight">
            Abadá <span class="text-capoeira-gold dark:text-capoeira-cream">Música</span>
          </span>
        </a>

        <!-- Desktop nav -->
        <nav class="hidden md:flex items-center gap-1 text-sm font-medium ml-2">
          @for (link of navLinks; track link.path) {
            <a [routerLink]="link.path" routerLinkActive="text-capoeira-gold"
               class="px-3 py-1.5 rounded-md text-stone-600 dark:text-stone-300 hover:text-capoeira-brown dark:hover:text-capoeira-cream hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
              {{ link.label }}
            </a>
          }
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
          @if (firebase.currentUser() && !firebase.isAdmin()) {
            <!-- Avatar button -->
            <button (click)="toggleDropdown()"
              class="w-8 h-8 rounded-full bg-capoeira-gold/20 text-capoeira-brown dark:text-capoeira-gold text-sm font-bold flex items-center justify-center hover:bg-capoeira-gold/30 transition-colors"
              [title]="firebase.currentUser()?.displayName || firebase.currentUser()?.email || ''">
              {{ userInitial() }}
            </button>

            <!-- Dropdown panel -->
            @if (dropdownOpen()) {
              <div class="absolute right-0 top-10 z-50 w-64 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-xl py-1">

                <!-- User info -->
                <div class="px-4 py-3 border-b border-stone-100 dark:border-stone-700">
                  <p class="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate">
                    {{ firebase.currentUser()?.displayName || 'Usuário' }}
                  </p>
                  <p class="text-xs text-stone-400 truncate">{{ firebase.currentUser()?.email }}</p>
                </div>

                <!-- Membership row -->
                <div class="px-4 py-3 border-b border-stone-100 dark:border-stone-700 flex items-center justify-between gap-2">
                  @if (firebase.membershipActive()) {
                    <span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full shrink-0">
                      Membro ativo
                    </span>
                    <button (click)="openPortal()" [disabled]="portalLoading()"
                      class="text-xs font-semibold text-capoeira-brown dark:text-capoeira-gold hover:underline disabled:opacity-50 transition-colors">
                      {{ portalLoading() ? 'Aguarde...' : 'Gerenciar assinatura' }}
                    </button>
                  } @else {
                    <span class="text-xs text-stone-400">Plano gratuito</span>
                    <a routerLink="/membership" (click)="closeDropdown()"
                      class="text-xs font-semibold text-capoeira-brown dark:text-capoeira-gold hover:underline transition-colors">
                      Seja Membro
                    </a>
                  }
                </div>

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
            <a routerLink="/login"
               class="text-sm font-semibold px-3 py-1.5 rounded-lg border border-capoeira-gold text-capoeira-gold hover:bg-capoeira-gold/10 transition-colors">
              Entrar
            </a>
          }
        </div>

        <!-- Mobile menu button -->
        <button (click)="mobileOpen.set(!mobileOpen())" class="md:hidden p-2 rounded-md text-stone-500" aria-label="Menu">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
      </div>

      <!-- Mobile menu -->
      @if (mobileOpen()) {
        <div class="md:hidden border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-3 space-y-2">
          <app-search-bar />

          <nav class="flex flex-col gap-1 pt-1">
            @for (link of navLinks; track link.path) {
              <a [routerLink]="link.path" routerLinkActive="text-capoeira-gold"
                 (click)="mobileOpen.set(false)"
                 class="px-3 py-2 rounded-md text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-sm font-medium">
                {{ link.label }}
              </a>
            }
            @if (firebase.isAdmin()) {
              <a routerLink="/admin" (click)="mobileOpen.set(false)"
                 class="px-3 py-2 rounded-md text-capoeira-gold hover:bg-capoeira-gold/10 text-sm font-semibold">
                Admin
              </a>
            }
            @if (firebase.currentUser() && !firebase.isAdmin()) {
              <!-- User info row -->
              <div class="flex items-center gap-2 px-3 py-2 border-t border-stone-100 dark:border-stone-700 mt-1 pt-2">
                <span class="w-7 h-7 rounded-full bg-capoeira-gold/20 text-capoeira-brown dark:text-capoeira-gold text-xs font-bold flex items-center justify-center shrink-0">
                  {{ userInitial() }}
                </span>
                <span class="text-sm text-stone-600 dark:text-stone-300 truncate">
                  {{ firebase.currentUser()?.displayName || firebase.currentUser()?.email }}
                </span>
              </div>
              <!-- Membership row -->
              <div class="flex items-center justify-between px-3 py-1">
                @if (firebase.membershipActive()) {
                  <span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                    Membro ativo
                  </span>
                  <button (click)="openPortal(); mobileOpen.set(false)" [disabled]="portalLoading()"
                    class="text-xs font-semibold text-capoeira-brown dark:text-capoeira-gold hover:underline disabled:opacity-50">
                    {{ portalLoading() ? 'Aguarde...' : 'Gerenciar assinatura' }}
                  </button>
                } @else {
                  <span class="text-xs text-stone-400">Plano gratuito</span>
                  <a routerLink="/membership" (click)="mobileOpen.set(false)"
                    class="text-xs font-semibold text-capoeira-brown dark:text-capoeira-gold hover:underline">
                    Seja Membro
                  </a>
                }
              </div>
              <!-- Sign out -->
              <button (click)="signOut(); mobileOpen.set(false)"
                class="px-3 py-2 text-xs text-stone-400 hover:text-red-500 transition-colors text-left w-full">
                Sair
              </button>
            }
            @if (!firebase.currentUser()) {
              <a routerLink="/login" (click)="mobileOpen.set(false)"
                 class="px-3 py-2 rounded-md text-center text-capoeira-gold border border-capoeira-gold hover:bg-capoeira-gold/10 text-sm font-semibold">
                Entrar
              </a>
            }
          </nav>
        </div>
      }
    </header>
  `,
})
export class HeaderComponent {
  theme = inject(ThemeService);
  firebase = inject(FirebaseService);
  private el = inject(ElementRef);

  mobileOpen = signal(false);
  dropdownOpen = signal(false);
  portalLoading = signal(false);

  navLinks = [
    { path: '/musicas', label: 'Músicas' },
    { path: '/toques', label: 'Toques' },
    { path: '/videos', label: 'Vídeos' },
  ];

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.el.nativeElement.contains(event.target)) {
      this.dropdownOpen.set(false);
    }
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
