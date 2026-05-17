import { Injectable, inject, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { Song } from '../models/song.model';
import { Toque } from '../models/toque.model';
import { Video } from '../models/video.model';
import { FirebaseService, SongOverride } from './firebase.service';

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
        type: (ov.type as Song['type']) ?? song.type,
        lyrics: ov.lyrics ?? song.lyrics,
        translation: ov.translation ?? song.translation,
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
    } catch {
      // Firebase not configured — app works with JSON-only data
    }
  }
}
