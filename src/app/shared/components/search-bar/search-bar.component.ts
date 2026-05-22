import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SearchService } from '../../../core/services/search.service';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="relative">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
      </svg>
      <input
        type="search"
        [ngModel]="search.query()"
        (ngModelChange)="search.query.set($event)"
        (focus)="open.set(true)"
        (blur)="onBlur()"
        (keydown.escape)="close()"
        placeholder="Buscar músicas, toques..."
        class="w-full pl-10 pr-4 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-capoeira-gold text-sm"
      />

      @if (open() && hasResults()) {
        <div class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl shadow-lg z-50 overflow-hidden">

          @if (results().songs.length) {
            <div class="px-3 pt-2 pb-1">
              <p class="text-xs font-semibold text-stone-400 uppercase tracking-wide">Músicas</p>
            </div>
            @for (song of results().songs; track song.id) {
              <a [routerLink]="['/musicas', song.id]" (mousedown)="close()"
                 class="flex items-center gap-3 px-3 py-3 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors">
                <span class="w-1.5 h-1.5 rounded-full shrink-0" [class]="typeDot(song.type)"></span>
                <span class="text-sm text-stone-700 dark:text-stone-200 truncate">{{ song.title }}</span>
              </a>
            }
          }

          @if (results().toques.length) {
            <div class="px-3 pt-2 pb-1" [class.border-t]="results().songs.length" [class.border-stone-100]="results().songs.length">
              <p class="text-xs font-semibold text-stone-400 uppercase tracking-wide">Toques</p>
            </div>
            @for (toque of results().toques; track toque.id) {
              <a [routerLink]="['/toques', toque.id]" (mousedown)="close()"
                 class="flex items-center gap-3 px-3 py-3 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors">
                <span class="text-base shrink-0">🪘</span>
                <span class="text-sm text-stone-700 dark:text-stone-200 truncate">{{ toque.name }}</span>
              </a>
            }
          }

        </div>
      }

      @if (open() && search.query().length >= 2 && !hasResults()) {
        <div class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl shadow-lg z-50 px-4 py-3">
          <p class="text-sm text-stone-400">Nenhum resultado para "{{ search.query() }}"</p>
        </div>
      }
    </div>
  `,
})
export class SearchBarComponent {
  search = inject(SearchService);
  open = signal(false);

  results = this.search.globalResults;

  hasResults() {
    const r = this.results();
    return r.songs.length > 0 || r.toques.length > 0;
  }

  close() {
    this.open.set(false);
    this.search.query.set('');
  }

  onBlur() {
    // small delay so mousedown on a result fires before blur hides the dropdown
    setTimeout(() => this.open.set(false), 150);
  }

  typeDot(type: string): string {
    const map: Record<string, string> = {
      ladainha: 'bg-amber-400', corrido: 'bg-emerald-400',
      louvacao: 'bg-sky-400',   quadra:  'bg-purple-400',
    };
    return map[type] ?? 'bg-stone-300';
  }
}
