import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <!-- Hero banner -->
    <section class="rounded-2xl bg-gradient-to-br from-capoeira-brown to-amber-900 text-white px-8 py-10 mb-8">
      <p class="text-amber-300 text-sm font-medium uppercase tracking-widest mb-2">Abadá Capoeira</p>
      <h1 class="font-display text-4xl md:text-5xl font-bold mb-3 leading-tight">
        Biblioteca<br>Musical
      </h1>
      <p class="text-amber-100/80 text-sm max-w-sm">
        Músicas, toques, mestres e álbuns da nossa tradição. Axé, camará.
      </p>
    </section>

    <!-- Quick nav -->
    <section class="grid grid-cols-3 gap-3 mb-10">
      @for (card of navCards; track card.path) {
        <a [routerLink]="card.path"
           class="group flex flex-col items-center gap-2 py-5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:border-capoeira-gold hover:shadow-sm transition-all text-center">
          <span class="text-2xl">{{ card.icon }}</span>
          <span class="text-sm font-semibold text-stone-700 dark:text-stone-300 group-hover:text-capoeira-brown dark:group-hover:text-capoeira-gold">{{ card.label }}</span>
          <span class="text-xs text-stone-400">{{ card.count() }}</span>
        </a>
      }
    </section>

    <!-- Recent songs -->
    <section>
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
  `,
})
export class HomeComponent {
  data = inject(DataService);

  navCards = [
    { path: '/musicas', icon: '🎵', label: 'Músicas', count: computed(() => `${this.data.songs().length} músicas`) },
    { path: '/toques', icon: '🪘', label: 'Toques', count: computed(() => `${this.data.toques().length} toques`) },
    { path: '/videos', icon: '📹', label: 'Vídeos', count: computed(() => `${this.data.videos().length} vídeos`) },
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
