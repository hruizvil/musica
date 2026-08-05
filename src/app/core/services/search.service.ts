import { Injectable, inject, signal, computed } from '@angular/core';
import { DataService } from './data.service';
import { FirebaseService } from './firebase.service';
import { normalizeForSearch } from '../utils/text-normalize';

/** Which of the signed-in user's own lists the results are narrowed to. */
export type Collection = 'all' | 'favorites' | 'learned';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private data = inject(DataService);
  private fb = inject(FirebaseService);

  readonly query = signal('');
  readonly activeToqueFilter = signal<string | null>(null);
  readonly activeCollection = signal<Collection>('all');

  /** Title, lyrics and composer. Songs saved under the old `mestre` key are mapped
   *  into `composer` by DataService, so matching composer covers them too. */
  private matchesText(song: { title: string; lyrics: string; composer: string | null }, q: string): boolean {
    if (!q) return true;
    return normalizeForSearch(song.title).includes(q) ||
      normalizeForSearch(song.lyrics).includes(q) ||
      normalizeForSearch(song.composer ?? '').includes(q);
  }

  readonly filteredSongs = computed(() => {
    const q = normalizeForSearch(this.query().trim());
    const toque = this.activeToqueFilter();
    const collection = this.activeCollection();
    const favorites = this.fb.favorites();
    const learned = this.fb.learnedSongs();

    return this.data.songs().filter(song => {
      const matchesToque = !toque || song.toque.includes(toque);
      const matchesCollection =
        collection === 'all' ||
        (collection === 'favorites' && favorites.has(song.id)) ||
        (collection === 'learned' && learned.has(song.id));
      return this.matchesText(song, q) && matchesToque && matchesCollection;
    });
  });

  readonly globalResults = computed(() => {
    const q = normalizeForSearch(this.query().trim());
    if (q.length < 2) return { songs: [], toques: [] };
    return {
      songs: this.data.songs().filter(s => this.matchesText(s, q)).slice(0, 5),
      toques: this.data.toques().filter(t =>
        normalizeForSearch(t.name).includes(q)
      ).slice(0, 3),
    };
  });

  clearFilters(): void {
    this.activeToqueFilter.set(null);
    this.activeCollection.set('all');
  }
}
