import { Injectable, computed, inject, signal } from '@angular/core';
import { DataService } from '../../core/services/data.service';
import { FirebaseService, SongOverride } from '../../core/services/firebase.service';
import { AudioLinks, Song } from '../../core/models/song.model';
import { Stroke } from '../../core/models/toque.model';

/** The strokes as the admin names them, with the Portuguese word the group uses. */
export const STROKE_NAME: Record<Stroke, { en: string; pt: string; hint: string }> = {
  tch: { en: 'Buzz', pt: 'chiado', hint: 'Stone resting on the wire' },
  dom: { en: 'Low', pt: 'dom', hint: 'Open string' },
  dim: { en: 'High', pt: 'dim', hint: 'Stone pressed on the wire' },
};

/** What a song can be missing, in the order the admin lists them. */
export type Gap = 'video' | 'translation' | 'chorusEn' | 'about' | 'aboutEn';

export const GAP_LABEL: Record<Gap, string> = {
  video: 'No video',
  translation: 'No translation',
  chorusEn: 'Chorus not translated',
  about: 'No "about" text',
  aboutEn: 'About: needs English',
};

/** The fields the editor works on. Everything is a plain string so empty means empty. */
export interface Draft {
  title: string;
  toque: string[];
  composer: string;
  youtube: string;
  refrao: string;
  refraoTranslation: string;
  lyrics: string;
  translation: string;
  notes: string;
  notesEn: string;
}

const EDITOR_KEY = 'studio-editor-name';

// Includes shorts/ and live/: a clip filmed on a phone gets shared as a Shorts link.
const YOUTUBE_RE = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/;

/** The 11-character video id from a pasted link or a bare id, or '' if there is none. */
export function youtubeId(input: string): string {
  const t = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(t)) return t;
  return t.match(YOUTUBE_RE)?.[1] ?? '';
}

function slugify(title: string): string {
  return title.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    + '-' + Date.now().toString(36);
}

/** Firestore refuses `undefined` anywhere in a document; this drops those keys. */
function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const orNull = (s: string) => s.trim() || null;

/**
 * The admin's shared state and its writes. Saving goes through the same two Firestore
 * collections the old admin uses (overrides for bundled songs, songs_extra for added
 * ones), so both admins read and write the same data while they live side by side.
 */
@Injectable({ providedIn: 'root' })
export class StudioService {
  private data = inject(DataService);
  private fb = inject(FirebaseService);

  /** The name this device saves under. Everyone shares one login, so it's asked per device. */
  readonly editor = signal<string>(this.readEditor());
  /** Set once the "who's editing" question has been answered or skipped on this visit. */
  readonly askedEditor = signal<boolean>(!!this.readEditor());

  readonly toast = signal('');
  private toastTimer: ReturnType<typeof setTimeout> | undefined;

  readonly songs = computed(() =>
    [...this.data.songs()].sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || '')));

  readonly gapCounts = computed(() => {
    const c: Record<Gap, number> = { video: 0, translation: 0, chorusEn: 0, about: 0, aboutEn: 0 };
    for (const s of this.songs()) for (const g of this.gaps(s)) c[g]++;
    return c;
  });

  gaps(s: Song): Gap[] {
    const g: Gap[] = [];
    if (!s.audioLinks?.youtube) g.push('video');
    if (s.lyrics?.trim() && !s.translation?.trim()) g.push('translation');
    if (s.refrao?.trim() && !s.refraoTranslation?.trim()) g.push('chorusEn');
    if (!s.notes?.trim() && !s.notesEn?.trim()) g.push('about');
    else if (s.notes?.trim() && !s.notesEn?.trim()) g.push('aboutEn');
    return g;
  }

  toqueName(id: string): string {
    return this.data.toques().find(t => t.id === id)?.name ?? id;
  }

  meta(id: string) {
    return this.data.songMeta().get(id) ?? null;
  }

  setEditor(name: string): void {
    const n = name.trim();
    this.editor.set(n);
    this.askedEditor.set(true);
    try { n ? localStorage.setItem(EDITOR_KEY, n) : localStorage.removeItem(EDITOR_KEY); } catch { /* storage blocked */ }
  }

  flash(message: string): void {
    this.toast.set(message);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(''), 3000);
  }

  draftOf(s: Song | null): Draft {
    return {
      title: s?.title ?? '', toque: [...(s?.toque ?? [])], composer: s?.composer ?? '',
      youtube: s?.audioLinks?.youtube ?? '',
      refrao: s?.refrao ?? '', refraoTranslation: s?.refraoTranslation ?? '',
      lyrics: s?.lyrics ?? '', translation: s?.translation ?? '',
      notes: s?.notes ?? '', notesEn: s?.notesEn ?? '',
    };
  }

  /** Saves an existing song, or adds a new one when `song` is null. Returns the song's id. */
  async save(song: Song | null, d: Draft): Promise<string> {
    const stamp = { updatedBy: this.editor() || null, updatedAt: new Date().toISOString() };
    const yt = youtubeId(d.youtube);
    const fields = {
      title: d.title.trim(), toque: d.toque, composer: orNull(d.composer),
      lyrics: d.lyrics.trim(), translation: orNull(d.translation),
      refrao: orNull(d.refrao), refraoTranslation: orNull(d.refraoTranslation),
      notes: orNull(d.notes), notesEn: orNull(d.notesEn),
    };
    const links = (spotify?: string): AudioLinks => {
      const a: AudioLinks = {};
      if (yt) a.youtube = yt;
      if (spotify) a.spotify = spotify; // no longer edited, but kept if a song has one
      return a;
    };

    if (!song) {
      const added: Song = {
        id: slugify(fields.title), ...fields, album: null, themes: [], audioLinks: links(),
        dateAdded: new Date().toISOString().split('T')[0], ...stamp,
      };
      await this.fb.saveExtraSong(clean(added));
      await this.data.refreshOverrides();
      return added.id;
    }

    if (this.data.extraSongIds().has(song.id)) {
      // Rebuilt from known fields rather than spread from `song`, which carries display-only
      // extras (a legacy "mestre" key, renamed toque ids) that shouldn't be written back.
      const updated: Song = {
        id: song.id, ...fields, album: song.album ?? null, themes: song.themes ?? [],
        audioLinks: links(song.audioLinks?.spotify), dateAdded: song.dateAdded,
        ...(song.preview !== undefined ? { preview: song.preview } : {}), ...stamp,
      };
      await this.fb.saveExtraSong(clean(updated));
    } else {
      // Bundled song: an override on top of the built-in text. A cleared field is saved
      // as null, which shows the built-in text again.
      const override: SongOverride = { ...fields, title: fields.title || song.title, lyrics: fields.lyrics || null, youtube: yt || null, ...stamp };
      await this.fb.saveSongOverride(song.id, clean(override));
    }
    await this.data.refreshOverrides();
    return song.id;
  }

  /** Saves a toque's pattern. An empty list is kept as "no pattern" so it also hides a built-in one. */
  async savePattern(toqueId: string, strokes: Stroke[]): Promise<void> {
    await this.fb.saveToquePattern(toqueId, { strokes, updatedBy: this.editor() || null, updatedAt: new Date().toISOString() });
    await this.data.refreshPatterns();
  }

  patternMeta(toqueId: string) {
    return this.data.patternMeta().get(toqueId) ?? null;
  }

  async remove(song: Song): Promise<void> {
    if (this.data.extraSongIds().has(song.id)) await this.fb.deleteExtraSong(song.id);
    else await this.fb.markDeleted(song.id);
    await this.data.refreshOverrides();
  }

  /** A failed write, in words: an expired sign-in reads differently from a lost connection. */
  errorText(e: unknown, action: 'save' | 'delete'): string {
    const code = (e as { code?: string } | null)?.code ?? '';
    return code === 'permission-denied' || code === 'unauthenticated'
      ? `Couldn't ${action}: your sign-in has expired. Sign out and sign in again`
      : `Couldn't ${action}. Check the connection and try again`;
  }

  /** Title and channel of a video, from YouTube's public oEmbed endpoint (no key needed). */
  async videoInfo(id: string): Promise<{ title: string; author: string } | null> {
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
      if (!res.ok) return null;
      const j = await res.json();
      const title = String(j?.title ?? '').trim().replace(/^["'‘’“”]+|["'‘’“”]+$/g, '').trim();
      return { title, author: String(j?.author_name ?? '').trim() };
    } catch {
      return null;
    }
  }

  private readEditor(): string {
    try { return localStorage.getItem(EDITOR_KEY) ?? ''; } catch { return ''; }
  }
}

/** "Sep 24" from "2026-09-24" or an ISO timestamp. */
export function shortDate(value: string | null | undefined): string {
  if (!value) return '';
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
