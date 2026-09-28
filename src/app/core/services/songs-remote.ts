import { Song } from '../models/song.model';
import { SongOverride } from './firebase.service';
import snapshot from '../../../assets/data/songs-remote.json';

/**
 * The admin's song data (edits, deletions, added songs) as saved by scripts/songs-snapshot.mjs
 * right before the build.
 *
 * The prerendered pages are built from it without touching Firestore, and the browser starts
 * from it too, so a first visit shows the right list even if Firestore is unreachable. Live
 * Firestore data replaces it a moment later in the browser.
 */
export interface SongCollections { overrides: Map<string, SongOverride>; extra: Song[]; }

export const SNAPSHOT_TIME = snapshot.fetchedAt;

export function snapshotCollections(): SongCollections {
  return {
    overrides: new Map(Object.entries(snapshot.overrides as Record<string, SongOverride>)),
    extra: snapshot.extra as unknown as Song[],
  };
}
