import { Injectable, inject, signal, computed } from '@angular/core';
import { DataService } from './data.service';
import { SongType } from '../models/song.model';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private data = inject(DataService);

  readonly query = signal('');
  readonly activeSongType = signal<SongType | null>(null);
  readonly activeToqueFilter = signal<string | null>(null);

  readonly filteredSongs = computed(() => {
    const q = this.query().toLowerCase().trim();
    const type = this.activeSongType();
    const toque = this.activeToqueFilter();

    return this.data.songs().filter(song => {
      const matchesQuery = !q ||
        song.title.toLowerCase().includes(q) ||
        song.lyrics.toLowerCase().includes(q) ||
        (song.composer ?? '').toLowerCase().includes(q);
      const matchesType = !type || song.type === type;
      const matchesToque = !toque || song.toque.includes(toque);
      return matchesQuery && matchesType && matchesToque;
    });
  });

  readonly globalResults = computed(() => {
    const q = this.query().toLowerCase().trim();
    if (q.length < 2) return { songs: [], toques: [] };
    return {
      songs: this.data.songs().filter(s =>
        s.title.toLowerCase().includes(q) || s.lyrics.toLowerCase().includes(q)
      ).slice(0, 5),
      toques: this.data.toques().filter(t =>
        t.name.toLowerCase().includes(q)
      ).slice(0, 3),
    };
  });

  clearFilters(): void {
    this.activeSongType.set(null);
    this.activeToqueFilter.set(null);
  }
}
