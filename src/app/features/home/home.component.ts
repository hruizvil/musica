import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { FirebaseService } from '../../core/services/firebase.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <!-- Hero -->
    <section class="rounded-2xl bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-capoeira-brown via-amber-900/90 to-capoeira-night text-white px-6 py-16 sm:px-10 sm:py-24 mb-10 relative overflow-hidden min-h-[60vh] flex flex-col justify-center">
      <div class="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-white/3 blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-8 -left-8 w-56 h-56 rounded-full bg-capoeira-gold/10 blur-3xl pointer-events-none"></div>
      <div class="absolute top-8 right-8 w-32 h-32 rounded-full border border-white/5 pointer-events-none"></div>

      <p class="text-capoeira-gold text-xs font-semibold uppercase tracking-widest mb-4 border-b border-capoeira-gold/30 pb-1 w-fit">Abadá Capoeira</p>
      <h1 class="font-display text-4xl sm:text-5xl md:text-7xl font-bold mb-5 leading-[1.05]">
        A biblioteca musical<br class="hidden sm:block"> da capoeira
      </h1>
      <p class="text-amber-100/70 text-base max-w-md leading-relaxed mb-10">
        Letras completas com tradução em inglês, organizadas por toque e estilo.
        Aprenda o repertório da roda — onde quer que você esteja.
      </p>

      <div class="flex flex-wrap gap-3">
        <a routerLink="/musicas"
           class="px-6 py-3 rounded-xl bg-capoeira-gold text-capoeira-brown font-bold text-sm hover:bg-amber-400 transition-colors shadow-lg shadow-capoeira-gold/20">
          Explorar músicas
        </a>
        @if (!firebase.currentUser() || (!firebase.membershipActive() && !firebase.isAdmin())) {
          <a routerLink="/membership"
             class="px-6 py-3 rounded-xl bg-white/10 ring-1 ring-white/25 text-white font-semibold text-sm hover:bg-white/20 transition-colors">
            Seja Membro — $2.99/mês
          </a>
        }
      </div>
    </section>

    <!-- Stats row -->
    <section class="grid grid-cols-3 gap-3 mb-10">
      @for (stat of stats(); track stat.label) {
        <a [routerLink]="stat.path"
           class="group flex flex-col items-center gap-2 py-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-capoeira-gold/30 transition-all duration-200 text-center">
          <span class="text-2xl">{{ stat.icon }}</span>
          <span class="text-2xl font-bold font-display text-capoeira-gold">{{ stat.count() }}</span>
          <span class="text-xs text-stone-400 font-medium">{{ stat.label }}</span>
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
          <div class="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:ring-1 hover:ring-capoeira-gold/20 transition-all duration-200">
            <div class="text-2xl mb-4 w-12 h-12 rounded-2xl bg-capoeira-gold/10 flex items-center justify-center">{{ reason.icon }}</div>
            <h3 class="font-bold text-stone-800 dark:text-stone-100 mb-2">{{ reason.title }}</h3>
            <p class="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">{{ reason.body }}</p>
          </div>
        }
      </div>
    </section>

    <!-- Recent songs -->
    <section class="mb-10">
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-display text-lg font-bold text-stone-800 dark:text-stone-100 border-l-4 border-capoeira-gold pl-4">Últimas adicionadas</h2>
        <a routerLink="/musicas" class="text-xs text-capoeira-gold hover:underline font-medium">Ver todas →</a>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        @for (song of data.recentSongs(); track song.id) {
          <a [routerLink]="['/musicas', song.id]"
             class="group flex flex-col gap-2 p-3 sm:p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 shadow-sm hover:shadow-lg hover:border-capoeira-gold/40 hover:-translate-y-0.5 transition-all duration-200">
            <span class="text-[15px] font-bold text-stone-800 dark:text-stone-100 group-hover:text-capoeira-brown dark:group-hover:text-capoeira-gold leading-snug line-clamp-2">{{ song.title }}</span>
          </a>
        }
      </div>
    </section>

    <!-- Membership CTA — non-members only -->
    @if (!firebase.membershipActive() && !firebase.isAdmin()) {
      <section class="rounded-2xl border border-capoeira-gold/30 bg-capoeira-gold/5 dark:bg-capoeira-gold/10 p-8 text-center mb-6">
        <h2 class="font-display text-2xl font-bold text-capoeira-brown dark:text-capoeira-cream mb-2">
          Acesso completo ao repertório
        </h2>
        <p class="text-sm text-stone-500 dark:text-stone-400 mb-6 max-w-sm mx-auto">
          Letras, traduções em inglês, e áudio de todas as músicas da biblioteca — por menos que um cafezinho por mês.
        </p>
        <a routerLink="/membership"
           class="inline-block px-8 py-3 rounded-xl bg-capoeira-gold text-capoeira-brown font-bold text-sm hover:bg-amber-400 transition-colors">
          Seja Membro — $2.99/mês
        </a>
        @if (!firebase.currentUser()) {
          <p class="text-xs text-stone-400 mt-3">
            Já tem conta? <a routerLink="/login" class="text-capoeira-gold hover:underline">Entrar</a>
          </p>
        }
      </section>
    }

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
  firebase = inject(FirebaseService);

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
      this.deferredPrompt = e;
      this.showInstall.set(true);
    });
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

  stats = computed(() => [
    { path: '/musicas', icon: '🎵', label: 'músicas', count: computed(() => `${this.data.songs().length}`) },
    { path: '/toques',  icon: '🪘', label: 'toques',  count: computed(() => `${this.data.toques().length}`) },
    { path: '/videos',  icon: '📹', label: 'vídeos',  count: computed(() => `${this.data.videos().length}`) },
  ]);

  whyUs = [
    {
      icon: '🇧🇷🇺🇸',
      title: 'Tradução em inglês',
      body: 'Cada letra tem tradução completa para inglês. Sites gratuitos só têm o português — sem contexto para quem está aprendendo.',
    },
    {
      icon: '🥁',
      title: 'Organizados por toque',
      body: 'Encontre músicas pelo ritmo que o berimbau está tocando. Angola, Regional, Abadá — cada tradição tem seu repertório.',
    },
    {
      icon: '🎓',
      title: 'Curado por professores',
      body: 'Não é um repositório aberto onde qualquer pessoa posta. O conteúdo é revisado e organizado por praticantes experientes.',
    },
  ];

  songTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      ladainha: 'Ladainha', corrido: 'Corrido', louvacao: 'Louvação', quadra: 'Quadra'
    };
    return labels[type] ?? type;
  }

  typeDot(type: string): string {
    const map: Record<string, string> = {
      ladainha: 'bg-amber-400', corrido: 'bg-emerald-400',
      louvacao: 'bg-sky-400',   quadra:  'bg-purple-400',
    };
    return map[type] ?? 'bg-stone-300';
  }
}
