import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { SongCardComponent } from '../../shared/components/song-card/song-card.component';

const CATEGORY_LABELS: Record<string, string> = {
  angola: 'Angola', regional: 'Regional', abada: 'Abadá', other: 'Outros',
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, SongCardComponent],
  template: `
    <!-- Hero. The photo layer is optional: drop a file at public/hero.jpg and it
         appears behind the scrim. Until then the gradient below carries the section,
         so a missing file degrades quietly instead of showing a broken box. -->
    <!-- Negative margins cancel the padding on <main> so the art runs to the edges of
         the screen and starts flush under the header, instead of sitting in the page
         as a rounded tile. It ends on a clean edge; the section below simply follows. -->
    <section class="-mx-4 sm:-mx-8 lg:-mx-12 -mt-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-capoeira-brown via-amber-900/90 to-capoeira-night text-white px-6 py-14 sm:px-10 lg:px-12 sm:py-20 mb-10 relative overflow-hidden min-h-[60vh] flex flex-col justify-center">
      <!-- Anchored right: the berimbaus live on the right of the photo, so bg-center
           would crop them out of a narrow viewport. The scrim below runs dark-to-clear
           left-to-right, keeping the headline legible over the open side of the image. -->
      <div class="absolute inset-0 bg-[url('/hero.jpg')] bg-cover bg-right opacity-70 pointer-events-none"></div>
      <div class="absolute inset-0 bg-gradient-to-r from-capoeira-night/90 via-capoeira-night/50 to-transparent pointer-events-none"></div>
      <div class="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-white/3 blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-8 -left-8 w-56 h-56 rounded-full bg-capoeira-gold/10 blur-3xl pointer-events-none"></div>
      <div class="absolute top-8 right-8 w-32 h-32 rounded-full border border-white/5 pointer-events-none"></div>

      <div class="relative">
        <p class="text-capoeira-gold text-xs font-semibold uppercase tracking-widest mb-4 border-b border-capoeira-gold/30 pb-1 w-fit">Abadá Capoeira</p>
        <h1 class="font-display text-4xl sm:text-5xl md:text-7xl font-bold mb-5 leading-[1.05]">
          A biblioteca musical<br class="hidden sm:block">
          da <span class="text-capoeira-gold">capoeira</span>
        </h1>
        <p class="text-amber-100/70 text-base max-w-md leading-relaxed mb-8">
          Letras completas com tradução em inglês, organizadas por toque e estilo.
          Aprenda o repertório da roda — onde quer que você esteja.
        </p>

        <div class="flex flex-wrap gap-3">
          <a routerLink="/musicas"
             class="px-6 py-3 rounded-xl bg-capoeira-gold text-capoeira-brown font-bold text-sm hover:bg-amber-400 transition-colors shadow-lg shadow-capoeira-gold/20">
            Explorar músicas
          </a>
        </div>

        <!-- Benefits, stated up front rather than buried further down the page. -->
        <div class="mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-x-8 gap-y-4">
          @for (badge of heroBadges; track badge.title) {
            <div class="flex items-center gap-2.5">
              <span class="w-8 h-8 shrink-0 rounded-lg bg-white/10 ring-1 ring-white/15 flex items-center justify-center text-sm">{{ badge.icon }}</span>
              <span class="leading-tight">
                <span class="block text-xs font-semibold text-white">{{ badge.title }}</span>
                <span class="block text-[11px] text-amber-100/60">{{ badge.body }}</span>
              </span>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- Stats row -->
    <section class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
      @for (stat of stats(); track stat.label) {
        <a [routerLink]="stat.path"
           class="group flex items-center gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-capoeira-gold/30 transition-all duration-200">
          <span class="w-12 h-12 shrink-0 rounded-2xl bg-capoeira-gold/10 flex items-center justify-center text-xl">{{ stat.icon }}</span>
          <span class="min-w-0">
            <span class="block text-2xl font-bold font-display text-capoeira-gold leading-none">{{ stat.count }}</span>
            <span class="block text-xs text-stone-500 dark:text-stone-400 font-medium mt-1">{{ stat.label }}</span>
            <span class="block text-[11px] text-stone-400 dark:text-stone-500 truncate mt-0.5">{{ stat.detail }}</span>
          </span>
        </a>
      }
    </section>

    <!-- Why us -->
    <section class="mb-10">
      <h2 class="font-display text-xl font-bold text-stone-800 dark:text-stone-100 mb-5 border-l-4 border-capoeira-gold pl-4">
        Por que somos diferentes
      </h2>
      <div class="grid sm:grid-cols-3 gap-4">
        @for (reason of whyUs; track reason.title) {
          <!-- The gold link stretches over the whole card (relative + after:inset-0), so
               tapping anywhere goes to it instead of hunting for the small text. A card
               with nowhere to go drops the hover lift too — the lift is a promise of a
               tap, and one that can't be honoured is what makes a card feel broken. -->
          <div class="relative flex flex-col p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 shadow-sm transition-all duration-200"
               [class]="reason.link ? 'hover:shadow-md hover:-translate-y-0.5 hover:ring-1 hover:ring-capoeira-gold/20' : ''">
            <div class="text-2xl mb-4 w-12 h-12 rounded-2xl bg-capoeira-gold/10 flex items-center justify-center">{{ reason.icon }}</div>
            <h3 class="font-bold text-stone-800 dark:text-stone-100 mb-2">{{ reason.title }}</h3>
            <p class="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">{{ reason.body }}</p>
            @if (reason.link) {
              <a [routerLink]="reason.link"
                 class="mt-4 w-fit py-1 text-xs font-semibold text-capoeira-gold hover:underline stretched-link after:rounded-2xl">
                {{ reason.linkLabel }} →
              </a>
            }
          </div>
        }
      </div>
    </section>

    <!-- Recent songs -->
    <section class="mb-10">
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-display text-lg font-bold text-stone-800 dark:text-stone-100 border-l-4 border-capoeira-gold pl-4">Últimas adicionadas</h2>
        <a routerLink="/musicas" class="text-xs text-capoeira-gold hover:underline font-medium py-2 -my-2">Ver todas →</a>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        @for (song of data.recentSongs(); track song.id) {
          <app-song-card [song]="song" />
        }
      </div>
    </section>

    <!-- Add to Home Screen prompt -->
    @if (showInstall()) {
      <section class="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-5 relative">
        <button (click)="dismissInstall()"
          class="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors text-sm"
          aria-label="Fechar">✕</button>

        <div class="flex items-start gap-4">
          <span class="text-3xl shrink-0">📱</span>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-stone-800 dark:text-stone-100 mb-1">
              Adicionar à tela inicial
            </p>
            @if (!isIOS()) {
              <p class="text-sm text-stone-500 dark:text-stone-400 mb-3">
                Instale o app para acesso rápido — funciona como um aplicativo nativo.
              </p>
              <button (click)="installApp()"
                class="px-4 py-2 rounded-lg bg-capoeira-gold text-capoeira-brown font-semibold text-sm hover:bg-amber-400 transition-colors">
                Instalar app
              </button>
            } @else {
              <p class="text-sm text-stone-500 dark:text-stone-400 mb-3">
                Abra no Safari e siga os passos:
              </p>
              <ol class="text-sm text-stone-600 dark:text-stone-300 space-y-1.5">
                <li class="flex items-start gap-2">
                  <span class="text-capoeira-gold font-bold shrink-0">1.</span>
                  Toque em <strong>Compartilhar</strong>
                  <svg class="w-4 h-4 inline mb-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                  </svg>
                  no Safari
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-capoeira-gold font-bold shrink-0">2.</span>
                  Role e toque em <strong>"Adicionar à tela de início"</strong>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-capoeira-gold font-bold shrink-0">3.</span>
                  Toque em <strong>Adicionar</strong>
                </li>
              </ol>
            }
          </div>
        </div>
      </section>
    }
  `,
})
export class HomeComponent implements OnInit {
  data = inject(DataService);

  showInstall = signal(false);
  isIOS = signal(false);
  private deferredPrompt: any = null;

  ngOnInit() {
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (localStorage.getItem('install-banner-dismissed') === '1') return;
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua) && /safari/.test(ua) && !/chrome/.test(ua)) {
      this.isIOS.set(true);
      this.showInstall.set(true);
    }
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      // Keep the prompt either way, so installApp() still works if we ever offer it.
      this.deferredPrompt = e;
      // Chromium fires this on desktop Chrome and Edge too, where the app installs to
      // its own window and there is no home screen — everything this card says would
      // be wrong. Desktop users who do want it still get Chrome's address-bar install.
      if (this.isPhoneSized()) this.showInstall.set(true);
    });
  }

  /** The same breakpoint styles.css treats as a phone, so the two agree. The iOS
   *  branch above does not need it: that path is already gated on the user agent,
   *  and an iPhone held sideways is wider than this. */
  private isPhoneSized(): boolean {
    return window.matchMedia('(max-width: 767px)').matches;
  }

  dismissInstall() {
    localStorage.setItem('install-banner-dismissed', '1');
    this.showInstall.set(false);
  }

  async installApp() {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    this.showInstall.set(false);
  }

  /** Songs added in the last 7 days, for the "what's new" line on the stats card. */
  private readonly addedThisWeek = computed(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return this.data.songs().filter(song => {
      const added = Date.parse(song.dateAdded);
      return !Number.isNaN(added) && added >= cutoff;
    }).length;
  });

  /** The traditions actually represented in the toque list, e.g. "Angola, Regional, Abadá". */
  private readonly toqueSummary = computed(() => {
    const seen: string[] = [];
    for (const toque of this.data.toques()) {
      const label = CATEGORY_LABELS[toque.category ?? 'other'] ?? CATEGORY_LABELS['other'];
      if (!seen.includes(label)) seen.push(label);
    }
    if (!seen.length) return 'Todos os ritmos';
    return seen.slice(0, 3).join(', ') + (seen.length > 3 ? '…' : '');
  });

  readonly stats = computed(() => {
    const videos = this.data.videos().length;
    const week = this.addedThisWeek();
    return [
      {
        path: '/musicas', icon: '🎵', label: 'músicas',
        count: `${this.data.songs().length}`,
        detail: week > 0 ? `+${week} esta semana` : 'Letras com tradução',
      },
      {
        path: '/toques', icon: '🪘', label: 'toques',
        count: `${this.data.toques().length}`,
        detail: this.toqueSummary(),
      },
      {
        path: '/videos', icon: '📹', label: 'vídeos',
        count: `${videos}`,
        detail: videos > 0 ? 'Aulas e demonstrações' : 'Em breve',
      },
    ];
  });

  readonly heroBadges = [
    { icon: '💬', title: 'Traduções em inglês', body: 'Letras lado a lado' },
    { icon: '🥁', title: 'Organizadas por toque', body: 'Encontre rápido' },
    { icon: '🎓', title: 'Conteúdo confiável', body: 'Curado por professores' },
  ];

  /** Only the two cards with a real destination get a link — there is no
   *  "sobre os professores" page to point the third one at. */
  readonly whyUs = [
    {
      // Not a flag pair: flag emoji are regional-indicator letters and Windows has no
      // glyphs for them, so the BR/US pair renders as the literal text "BRUS" in Chrome.
      icon: '💬',
      title: 'Tradução em inglês',
      body: 'Cada letra tem tradução completa para inglês. Sites gratuitos só têm o português — sem contexto para quem está aprendendo.',
      link: '/musicas' as string | null,
      linkLabel: 'Ver as letras',
    },
    {
      icon: '🥁',
      title: 'Organizados por toque',
      body: 'Encontre músicas pelo ritmo que o berimbau está tocando. Angola, Regional, Abadá — cada tradição tem seu repertório.',
      link: '/toques' as string | null,
      linkLabel: 'Ver os toques',
    },
    {
      icon: '🎓',
      title: 'Curado por professores',
      body: 'Não é um repositório aberto onde qualquer pessoa posta. O conteúdo é revisado e organizado por praticantes experientes.',
      link: null as string | null,
      linkLabel: '',
    },
  ];
}
