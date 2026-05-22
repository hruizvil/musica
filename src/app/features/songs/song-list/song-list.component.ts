import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SearchService } from '../../../core/services/search.service';
import { DataService } from '../../../core/services/data.service';
import { FirebaseService } from '../../../core/services/firebase.service';
import { FilterChipComponent } from '../../../shared/components/filter-chip/filter-chip.component';
import { SearchBarComponent } from '../../../shared/components/search-bar/search-bar.component';
import { Song, SongType } from '../../../core/models/song.model';

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

      <!-- Filters -->
      <div class="space-y-3">
        <!-- Type -->
        <div class="flex flex-wrap gap-2 items-center">
          <span class="text-xs font-semibold text-stone-400 uppercase tracking-wide w-full sm:w-auto">Tipo</span>
          @for (type of songTypes; track type.value) {
            <app-filter-chip
              [label]="type.label"
              [active]="search.activeSongType() === type.value"
              (toggle)="search.activeSongType.set(search.activeSongType() === type.value ? null : type.value)" />
          }
        </div>

        <!-- Toque -->
        <div class="flex flex-wrap gap-2 items-center">
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <span class="text-xs font-semibold text-stone-400 uppercase tracking-wide">Toque</span>
            <button (click)="toqueFilterOpen.set(!toqueFilterOpen())"
              class="sm:hidden ml-auto text-xs text-stone-400 hover:text-capoeira-gold transition-colors px-2 py-1">
              {{ toqueFilterOpen() ? '▴ Menos' : '▾ Ver toques' }}
            </button>
          </div>
          <div class="contents sm:contents" [class.hidden]="!toqueFilterOpen()">
            @for (toque of data.toques(); track toque.id) {
              <app-filter-chip
                [label]="toque.name"
                [active]="search.activeToqueFilter() === toque.id"
                (toggle)="search.activeToqueFilter.set(search.activeToqueFilter() === toque.id ? null : toque.id)" />
            }
          </div>
        </div>

        <!-- Themes -->
        @if (data.allThemes().length) {
          <div class="flex flex-wrap gap-2 items-center">
            <span class="text-xs font-semibold text-stone-400 uppercase tracking-wide w-full sm:w-auto">Tema</span>
            @for (theme of data.allThemes(); track theme) {
              <app-filter-chip
                [label]="theme"
                [active]="search.activeThemeFilter() === theme"
                (toggle)="search.activeThemeFilter.set(search.activeThemeFilter() === theme ? null : theme)" />
            }
          </div>
        }

        @if (search.activeSongType() || search.activeToqueFilter() || search.activeThemeFilter()) {
          <button (click)="search.clearFilters()" class="text-xs text-stone-400 hover:text-capoeira-gold underline">
            Limpar filtros
          </button>
        }
      </div>

      <!-- Song grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        @for (song of search.filteredSongs(); track song.id) {
          @if (isAccessible(song)) {
            <a [routerLink]="['/musicas', song.id]"
               class="group relative flex flex-col gap-2 p-3 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:border-capoeira-gold hover:shadow-sm transition-all">
              <div class="flex items-center justify-between">
                <span class="w-2 h-2 rounded-full shrink-0" [class]="typeDot(song.type)"></span>
                <div class="flex items-center gap-1.5">
                  @if (firebase.learnedSongs().has(song.id)) {
                    <span title="Aprendida" class="text-emerald-500 text-xs leading-none">✓</span>
                  }
                  @if (firebase.favorites().has(song.id)) {
                    <span title="Favorita" class="text-red-400 text-xs leading-none">♥</span>
                  }
                  <span class="text-xs text-stone-400">{{ typeLabel(song.type) }}</span>
                </div>
              </div>
              <span class="text-sm font-semibold text-stone-800 dark:text-stone-100 group-hover:text-capoeira-brown dark:group-hover:text-capoeira-gold leading-snug line-clamp-2">{{ song.title }}</span>
              @if (song.toque.length) {
                <span class="text-xs text-stone-400 truncate mt-auto">{{ toqueName(song.toque[0]) }}</span>
              }
            </a>
          } @else {
            <div class="flex flex-col gap-2 p-3 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 opacity-60 cursor-default">
              <div class="flex items-center justify-between">
                <svg class="w-3 h-3 text-stone-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
                <span class="text-xs text-stone-400">{{ typeLabel(song.type) }}</span>
              </div>
              <span class="text-sm font-semibold text-stone-600 dark:text-stone-400 leading-snug line-clamp-2">{{ song.title }}</span>
              <a routerLink="/membership"
                 class="text-xs text-capoeira-gold hover:underline mt-auto opacity-100 cursor-pointer">
                Seja Membro →
              </a>
            </div>
          }
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
  firebase = inject(FirebaseService);
  toqueFilterOpen = signal(false);

  songTypes = Object.entries(SONG_TYPE_LABELS).map(([value, label]) => ({ value: value as SongType, label }));

  isAccessible(song: Song): boolean {
    return !!song.preview || this.firebase.membershipActive() || this.firebase.isAdmin();
  }

  typeLabel(type: string): string {
    return SONG_TYPE_LABELS[type as SongType] ?? type;
  }

  toqueName(id: string): string {
    return this.data.toqueById().get(id)?.name ?? id;
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
