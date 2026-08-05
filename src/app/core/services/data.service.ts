import { Injectable, inject, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { Song } from '../models/song.model';
import { Toque } from '../models/toque.model';
import { Video } from '../models/video.model';
import { FirebaseService, SongOverride } from './firebase.service';

// Last server state, kept in localStorage so a refresh can hide deleted songs on
// the very first paint instead of showing them until Firestore answers.
const OVERRIDES_CACHE_KEY = 'capoeira-overrides-cache';
const EXTRA_CACHE_KEY = 'capoeira-extra-cache';

@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);
  private fb = inject(FirebaseService);

  private baseSongs = toSignal(
    this.http.get<{ songs: Song[] }>('assets/data/songs.json').pipe(map(r => r.songs)),
    { initialValue: [] as Song[] }
  );

  readonly toques = toSignal(
    this.http.get<{ toques: Toque[] }>('assets/data/toques.json').pipe(map(r => r.toques)),
    { initialValue: [] as Toque[] }
  );

  readonly videos = toSignal(
    this.http.get<{ videos: Video[] }>('assets/data/videos.json').pipe(map(r => r.videos)),
    { initialValue: [] as Video[] }
  );

  private overrides = signal<Map<string, SongOverride>>(new Map());
  private extraSongs = signal<Song[]>([]);

  readonly songs = computed(() => {
    const overrides = this.overrides();
    const merged: Song[] = this.baseSongs().map(song => {
      const ov = overrides.get(song.id);
      if (!ov || ov.deleted) return ov?.deleted ? null : song;
      return {
        ...song,
        title: ov.title ?? song.title,
        toque: ov.toque ?? song.toque,
        mestre: (ov.mestre ?? song.mestre) as string | null,
        preview: ov.preview ?? false,
        lyrics: ov.lyrics ?? song.lyrics,
        translation: ov.translation ?? song.translation,
        // The admin saves these three, so they have to be merged back or the edit
        // is silently discarded on render.
        notes: ov.notes ?? song.notes,
        refrao: ov.refrao ?? song.refrao,
        refraoTranslation: ov.refraoTranslation ?? song.refraoTranslation,
        audioLinks: {
          youtube: ov.youtube ?? song.audioLinks.youtube,
          spotify: ov.spotify ?? song.audioLinks.spotify,
        },
      };
    }).filter((s): s is Song => s !== null);

    const extraFiltered = this.extraSongs().filter(s => !overrides.get(s.id)?.deleted);
    return [...merged, ...extraFiltered];
  });

  readonly songsLoaded = computed(() => this.baseSongs().length > 0);
  readonly extraSongIds = computed(() => new Set(this.extraSongs().map(s => s.id)));
  readonly songById = computed(() => new Map(this.songs().map(s => [s.id, s])));
  readonly toqueById = computed(() => new Map(this.toques().map(t => [t.id, t])));

  readonly songsByToque = computed(() => {
    const map = new Map<string, Song[]>();
    for (const song of this.songs()) {
      for (const toqueId of song.toque) {
        if (!map.has(toqueId)) map.set(toqueId, []);
        map.get(toqueId)!.push(song);
      }
    }
    return map;
  });

  readonly recentSongs = computed(() =>
    [...this.songs()]
      .sort((a, b) => b.dateAdded.localeCompare(a.dateAdded))
      .slice(0, 6)
  );

  constructor() {
    this.seedFromCache();
    this.refreshOverrides();
  }

  async refreshOverrides(): Promise<void> {
    try {
      const [overridesMap, extra] = await Promise.all([
        this.fb.getSongOverrides(),
        this.fb.getExtraSongs(),
      ]);
      this.overrides.set(overridesMap);
      this.extraSongs.set(extra);
      this.writeCache(overridesMap, extra);
    } catch {
      // Firebase not configured — app works with JSON-only data
    }
  }

  /** Prime the signals from the last cached server state so the first render is
   *  already correct. Firestore then reconciles a moment later. */
  private seedFromCache(): void {
    try {
      const rawOverrides = localStorage.getItem(OVERRIDES_CACHE_KEY);
      if (rawOverrides) {
        this.overrides.set(new Map(JSON.parse(rawOverrides) as [string, SongOverride][]));
      }
      const rawExtra = localStorage.getItem(EXTRA_CACHE_KEY);
      if (rawExtra) {
        this.extraSongs.set(JSON.parse(rawExtra) as Song[]);
      }
    } catch {
      // no cache, corrupt cache, or storage unavailable — the refresh fills it in
    }
  }

  private writeCache(overrides: Map<string, SongOverride>, extra: Song[]): void {
    try {
      localStorage.setItem(OVERRIDES_CACHE_KEY, JSON.stringify([...overrides.entries()]));
      localStorage.setItem(EXTRA_CACHE_KEY, JSON.stringify(extra));
    } catch {
      // storage full or unavailable — caching is best-effort
    }
  }
}
