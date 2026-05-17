import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SearchService } from '../../../core/services/search.service';
import { DataService } from '../../../core/services/data.service';
import { FilterChipComponent } from '../../../shared/components/filter-chip/filter-chip.component';
import { SearchBarComponent } from '../../../shared/components/search-bar/search-bar.component';
import { SongType } from '../../../core/models/song.model';

const SONG_TYPE_LABELS: Record<SongType, string> = {
  ladainha: 'Ladainha', corrido: 'Corrido', louvacao: 'Louvação', quadra: 'Quadra'
};

@Component({
  selector: 'app-song-list',
  standalone: true,
  imports: [RouterLink, FilterChipComponent, SearchBarComponent],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="font-display text-3xl font-bold text-capoeira-brown dark:text-capoeira-cream">Músicas</h1>
        <p class="text-stone-400 text-sm mt-1">{{ search.filteredSongs().length }} resultado(s)</p>
      </div>

      <app-search-bar />

      <!-- Filters: type -->
      <div class="space-y-3">
        <div class="flex flex-wrap gap-2 items-center">
          <span class="text-xs font-semibold text-stone-400 uppercase tracking-wide w-full sm:w-auto">Tipo</span>
          @for (type of songTypes; track type.value) {
            <app-filter-chip
              [label]="type.label"
              [active]="search.activeSongType() === type.value"
              (toggle)="search.activeSongType.set(search.activeSongType() === type.value ? null : type.value)" />
          }
        </div>

        <!-- Filters: toque -->
        <div class="flex flex-wrap gap-2 items-center">
          <span class="text-xs font-semibold text-stone-400 uppercase tracking-wide w-full sm:w-auto">Toque</span>
          @for (toque of data.toques(); track toque.id) {
            <app-filter-chip
              [label]="toque.name"
              [active]="search.activeToqueFilter() === toque.id"
              (toggle)="search.activeToqueFilter.set(search.activeToqueFilter() === toque.id ? null : toque.id)" />
          }
        </div>

        @if (search.activeSongType() || search.activeToqueFilter()) {
          <button (click)="search.clearFilters()" class="text-xs text-stone-400 hover:text-capoeira-gold underline">
            Limpar filtros
          </button>
        }
      </div>

      <!-- Song grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        @for (song of search.filteredSongs(); track song.id) {
          <a [routerLink]="['/musicas', song.id]"
             class="group flex flex-col gap-2 p-3 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:border-capoeira-gold hover:shadow-sm transition-all">
            <div class="flex items-center justify-between">
              <span class="w-2 h-2 rounded-full shrink-0" [class]="typeDot(song.type)"></span>
              <span class="text-xs text-stone-400">{{ typeLabel(song.type) }}</span>
            </div>
            <span class="text-sm font-semibold text-stone-800 dark:text-stone-100 group-hover:text-capoeira-brown dark:group-hover:text-capoeira-gold leading-snug line-clamp-2">{{ song.title }}</span>
            @if (song.toque.length) {
              <span class="text-xs text-stone-400 truncate mt-auto">{{ toqueName(song.toque[0]) }}</span>
            }
          </a>
        } @empty {
          <p class="col-span-full text-center text-stone-400 py-8">Nenhuma música encontrada.</p>
        }
      </div>
    </div>
  `,
})
export class SongListComponent {
  search = inject(SearchService);
  data = inject(DataService);

  songTypes = Object.entries(SONG_TYPE_LABELS).map(([value, label]) => ({ value: value as SongType, label }));

  typeLabel(type: string): string {
    return SONG_TYPE_LABELS[type as SongType] ?? type;
  }

  toqueName(id: string): string {
    return this.data.toqueById().get(id)?.name ?? id;
  }

  rowMeta(song: { type: string; toque: string[] }): string {
    const parts = [this.typeLabel(song.type)];
    if (song.toque.length) parts.push(this.toqueName(song.toque[0]));
    return parts.join(' · ');
  }

  typeDot(type: string): string {
    const map: Record<string, string> = {
      ladainha: 'bg-amber-400',
      corrido:  'bg-emerald-400',
      louvacao: 'bg-sky-400',
      quadra:   'bg-purple-400',
    };
    return map[type] ?? 'bg-stone-300';
  }
}
