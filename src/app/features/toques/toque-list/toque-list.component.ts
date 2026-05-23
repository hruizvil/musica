import { Component, inject, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../../core/services/data.service';
import { Toque } from '../../../core/models/toque.model';

const TEMPO_LABELS: Record<string, string> = {
  slow: 'Lento', medium: 'Médio', fast: 'Rápido', variable: 'Variável'
};

const CATEGORY_LABELS: Record<string, string> = {
  angola: 'Capoeira Angola',
  regional: 'Capoeira Regional',
  abada: 'Capoeira Abadá',
  other: 'Outros Ritmos',
};

const CATEGORY_ORDER = ['angola', 'regional', 'abada', 'other'];

const TAB_LABELS: Record<string, string> = {
  angola: 'Angola',
  regional: 'Regional',
  abada: 'Abadá',
  other: 'Outros',
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

      <!-- Tabs -->
      <div class="flex gap-0 border-b border-stone-200 dark:border-stone-700 overflow-x-auto">
        @for (tab of allTabs(); track tab.key) {
          <button (click)="activeTab.set(tab.key)"
            class="px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px shrink-0"
            [class]="activeTab() === tab.key
              ? 'border-capoeira-gold text-capoeira-brown dark:text-capoeira-gold'
              : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'">
            {{ tab.label }}
          </button>
        }
      </div>

      @for (group of visibleGroups(); track group.category) {
        <section class="space-y-3">
          @if (activeTab() === 'all') {
            <div class="flex items-center gap-3">
              <h2 class="font-display text-lg font-semibold text-capoeira-brown dark:text-capoeira-cream">
                {{ group.label }}
              </h2>
              <div class="flex-1 h-px bg-stone-200 dark:bg-stone-700"></div>
              <span class="text-xs text-stone-400">{{ group.toques.length }} toque(s)</span>
            </div>
          }

          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            @for (toque of group.toques; track toque.id) {
              <a [routerLink]="['/toques', toque.id]"
                 class="group p-5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:border-capoeira-gold hover:shadow-md transition-all">
                <div class="flex items-start justify-between mb-3">
                  <h3 class="font-display text-base font-semibold text-stone-800 dark:text-stone-100 group-hover:text-capoeira-brown dark:group-hover:text-capoeira-gold leading-snug">
                    {{ toque.name }}
                  </h3>
                  <span [class]="tempoClass(toque.tempo)" class="px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ml-2">
                    {{ tempoLabel(toque.tempo) }}
                  </span>
                </div>
                <p class="text-sm text-stone-500 dark:text-stone-400 line-clamp-2">{{ toque.context }}</p>
                @if (songCount(toque.id)) {
                  <p class="mt-3 text-xs text-stone-400">{{ songCount(toque.id) }} música(s)</p>
                }
              </a>
            }
          </div>
        </section>
      }
    </div>
  `,
})
export class ToqueListComponent {
  data = inject(DataService);
  activeTab = signal<string>('angola');

  grouped = computed(() => {
    const byCategory = new Map<string, Toque[]>();
    for (const toque of this.data.toques()) {
      const cat = toque.category ?? 'other';
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(toque);
    }
    return CATEGORY_ORDER
      .filter(c => byCategory.has(c))
      .map(c => ({ category: c, label: CATEGORY_LABELS[c] ?? c, toques: byCategory.get(c)! }));
  });

  allTabs = computed(() => [
    { key: 'all', label: 'Todos' },
    ...CATEGORY_ORDER
      .filter(c => this.grouped().some(g => g.category === c))
      .map(c => ({ key: c, label: TAB_LABELS[c] ?? c })),
  ]);

  visibleGroups = computed(() =>
    this.activeTab() === 'all'
      ? this.grouped()
      : this.grouped().filter(g => g.category === this.activeTab())
  );

  tempoLabel(t: string): string { return TEMPO_LABELS[t] ?? t; }

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
