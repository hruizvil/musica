import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { FirebaseService } from '../../core/services/firebase.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <!-- Hero -->
    <section class="rounded-2xl bg-gradient-to-br from-capoeira-brown via-amber-900 to-stone-900 text-white px-8 py-12 mb-10 relative overflow-hidden">
      <!-- decorative rings -->
      <div class="absolute -top-12 -right-12 w-64 h-64 rounded-full border border-white/5 pointer-events-none"></div>
      <div class="absolute -top-4 -right-4 w-40 h-40 rounded-full border border-white/5 pointer-events-none"></div>

      <p class="text-capoeira-gold text-xs font-semibold uppercase tracking-widest mb-3">Abadá Capoeira</p>
      <h1 class="font-display text-4xl md:text-5xl font-bold mb-4 leading-tight">
        A biblioteca musical<br class="hidden sm:block"> da capoeira
      </h1>
      <p class="text-amber-100/75 text-sm max-w-md leading-relaxed mb-8">
        Letras completas com tradução em inglês, organizadas por toque e estilo.
        Aprenda o repertório da roda — onde quer que você esteja.
      </p>

      <div class="flex flex-wrap gap-3">
        <a routerLink="/musicas"
           class="px-5 py-2.5 rounded-xl bg-capoeira-gold text-capoeira-brown font-bold text-sm hover:bg-amber-400 transition-colors">
          Explorar músicas
        </a>
        @if (!firebase.currentUser() || (!firebase.membershipActive() && !firebase.isAdmin())) {
          <a routerLink="/membership"
             class="px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-semibold text-sm hover:bg-white/20 transition-colors">
            Seja Membro — $2.99/mês
          </a>
        }
      </div>
    </section>

    <!-- Stats row -->
    <section class="grid grid-cols-3 gap-3 mb-10">
      @for (stat of stats(); track stat.label) {
        <a [routerLink]="stat.path"
           class="group flex flex-col items-center gap-1.5 py-5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:border-capoeira-gold hover:shadow-sm transition-all text-center">
          <span class="text-2xl">{{ stat.icon }}</span>
          <span class="text-lg font-bold text-stone-800 dark:text-stone-100 group-hover:text-capoeira-brown dark:group-hover:text-capoeira-gold">{{ stat.count() }}</span>
          <span class="text-xs text-stone-400">{{ stat.label }}</span>
        </a>
      }
    </section>

    <!-- Why us -->
    <section class="mb-10">
      <h2 class="font-display text-xl font-bold text-stone-800 dark:text-stone-100 mb-5">
        Por que somos diferentes
      </h2>
      <div class="grid sm:grid-cols-3 gap-4">
        @for (reason of whyUs; track reason.title) {
          <div class="p-5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
            <div class="text-2xl mb-3">{{ reason.icon }}</div>
            <h3 class="font-semibold text-stone-800 dark:text-stone-100 mb-1.5">{{ reason.title }}</h3>
            <p class="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">{{ reason.body }}</p>
          </div>
        }
      </div>
    </section>

    <!-- Recent songs -->
    <section class="mb-10">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">Últimas adicionadas</h2>
        <a routerLink="/musicas" class="text-xs text-capoeira-gold hover:underline">Ver todas →</a>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        @for (song of data.recentSongs(); track song.id) {
          <a [routerLink]="['/musicas', song.id]"
             class="group flex flex-col gap-2 p-3 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:border-capoeira-gold hover:shadow-sm transition-all">
            <div class="flex items-center justify-between">
              <span class="w-2 h-2 rounded-full shrink-0" [class]="typeDot(song.type)"></span>
              <span class="text-xs text-stone-400">{{ songTypeLabel(song.type) }}</span>
            </div>
            <span class="text-sm font-semibold text-stone-800 dark:text-stone-100 group-hover:text-capoeira-brown dark:group-hover:text-capoeira-gold leading-snug line-clamp-2">{{ song.title }}</span>
          </a>
        }
      </div>
    </section>

    <!-- Membership CTA — non-members only -->
    @if (!firebase.membershipActive() && !firebase.isAdmin()) {
      <section class="rounded-2xl border border-capoeira-gold/30 bg-capoeira-gold/5 dark:bg-capoeira-gold/10 p-8 text-center">
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
  `,
})
export class HomeComponent {
  data = inject(DataService);
  firebase = inject(FirebaseService);

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
