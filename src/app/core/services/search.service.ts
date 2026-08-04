import { Injectable, inject, signal, computed } from '@angular/core';
import { DataService } from './data.service';
import { SongType } from '../models/song.model';
import { normalizeForSearch } from '../utils/text-normalize';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private data = inject(DataService);

  readonly query = signal('');
  readonly activeSongType = signal<SongType | null>(null);
  readonly activeToqueFilter = signal<string | null>(null);

  readonly filteredSongs = computed(() => {
    const q = normalizeForSearch(this.query().trim());
    const type = this.activeSongType();
    const toque = this.activeToqueFilter();

    return this.data.songs().filter(song => {
      const matchesQuery = !q ||
        normalizeForSearch(song.title).includes(q) ||
        normalizeForSearch(song.lyrics).includes(q) ||
        normalizeForSearch(song.composer ?? '').includes(q);
      const matchesType = !type || song.type === type;
      const matchesToque = !toque || song.toque.includes(toque);
      return matchesQuery && matchesType && matchesToque;
    });
  });

  readonly globalResults = computed(() => {
    const q = normalizeForSearch(this.query().trim());
    if (q.length < 2) return { songs: [], toques: [] };
    return {
      songs: this.data.songs().filter(s =>
        normalizeForSearch(s.title).includes(q) || normalizeForSearch(s.lyrics).includes(q)
      ).slice(0, 5),
      toques: this.data.toques().filter(t =>
        normalizeForSearch(t.name).includes(q)
      ).slice(0, 3),
    };
  });

  clearFilters(): void {
    this.activeSongType.set(null);
    this.activeToqueFilter.set(null);
  }
}
