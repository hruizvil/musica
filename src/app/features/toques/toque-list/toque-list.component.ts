import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../../core/services/data.service';

const TEMPO_LABELS: Record<string, string> = {
  slow: 'Lento', medium: 'Médio', fast: 'Rápido', variable: 'Variável'
};

@Component({
  selector: 'app-toque-list',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="font-display text-3xl font-bold text-capoeira-brown dark:text-capoeira-cream">Toques de Capoeira</h1>
        <p class="text-stone-400 text-sm mt-1">Os ritmos do berimbau que comandam o jogo</p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        @for (toque of data.toques(); track toque.id) {
          <a [routerLink]="['/toques', toque.id]"
             class="group p-5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:border-capoeira-gold hover:shadow-md transition-all">
            <div class="flex items-start justify-between mb-3">
              <h2 class="font-display text-lg font-semibold text-stone-800 dark:text-stone-100 group-hover:text-capoeira-brown dark:group-hover:text-capoeira-gold">
                {{ toque.name }}
              </h2>
              <span [class]="tempoClass(toque.tempo)" class="px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ml-2">
                {{ tempoLabel(toque.tempo) }}
              </span>
            </div>
            <p class="text-sm text-stone-500 dark:text-stone-400 line-clamp-3">{{ toque.context }}</p>
            <div class="mt-3 flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-full text-xs bg-stone-100 dark:bg-stone-700 text-stone-500">
                {{ categoryLabel(toque.category) }}
              </span>
              @if (songCount(toque.id)) {
                <span class="text-xs text-stone-400">{{ songCount(toque.id) }} música(s)</span>
              }
            </div>
          </a>
        }
      </div>
    </div>
  `,
})
export class ToqueListComponent {
  data = inject(DataService);

  tempoLabel(t: string): string { return TEMPO_LABELS[t] ?? t; }
  categoryLabel(c: string): string {
    return c === 'angola' ? 'Angola' : c === 'regional' ? 'Regional' : 'Outro';
  }

  tempoClass(t: string): string {
    if (t === 'slow') return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300';
    if (t === 'fast') return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300';
    if (t === 'medium') return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300';
    return 'bg-stone-100 dark:bg-stone-700 text-stone-500';
  }

  songCount(id: string): number {
    return this.data.songsByToque().get(id)?.length ?? 0;
  }
}
