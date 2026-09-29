import { InjectionToken, makeStateKey } from '@angular/core';
import { Song } from '../models/song.model';
import { SongOverride } from './firebase.service';
import { ToquePattern } from '../models/toque.model';

/**
 * The admin's song data (edits, deletions, added songs) as saved by scripts/songs-snapshot.mjs
 * right before the build, in src/assets/data/songs-remote.json.
 *
 * The file is kept out of the browser bundle. The server reads it (SONG_SNAPSHOT, provided in
 * app.config.server.ts) and every prerendered page carries it in its transfer state, so the
 * page starts from the same data it was built with. Pages rendered in the browser fetch the
 * file instead, as a fallback until Firestore answers.
 */
export interface SongSnapshot {
  fetchedAt: string;
  overrides: Record<string, SongOverride>;
  extra: Song[];
  /** Berimbau patterns saved in the admin, by toque id. Older snapshots don't have it. */
  patterns?: Record<string, ToquePattern>;
}
export interface SongCollections { overrides: Map<string, SongOverride>; extra: Song[]; }

export const SONG_SNAPSHOT = new InjectionToken<SongSnapshot>('SONG_SNAPSHOT');
export const SONG_SNAPSHOT_STATE = makeStateKey<SongSnapshot>('song-snapshot');
export const SONG_SNAPSHOT_URL = 'assets/data/songs-remote.json';

export function fromSnapshot(s: SongSnapshot): SongCollections {
  return { overrides: new Map(Object.entries(s.overrides)), extra: s.extra };
}
