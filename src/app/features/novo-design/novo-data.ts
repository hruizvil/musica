import { Song } from '../../core/models/song.model';
import { ToqueCategory } from '../../core/models/toque.model';

/** One colour per toque. Every one carries white text at 4.5:1 or better. */
export const TOQUE_COLOR: Record<string, string> = {
  'angola': '#3b2f8f', 'sao-bento-pequeno': '#155e75', 'sao-bento-grande-angola': '#8a3412',
  'sao-bento-grande-regional': '#b42318', 'iuna': '#0f6b63', 'santa-maria': '#9d174d', 'idalina': '#5b21b6',
  'amazonas': '#166534', 'cavalaria': '#1e3a8a', 'sao-bento-abada': '#c2410c', 'benguela': '#8f5a06',
  'siriunha': '#be123c', 'jogo-dos-bichos': '#3f6212', 'capuxadama': '#6d28d9', 'toque-do-berimbau': '#7c4a0e',
  'capopasso': '#0e7490', 'samba-de-roda': '#a21caf', 'maculele': '#374151',
};
export const FALLBACK_COLOR = '#374151';
export const LIKED_COLOR = '#4338ca';
export const LEARNED_COLOR = '#047857';

export function toqueColor(id: string | undefined): string {
  return (id && TOQUE_COLOR[id]) || FALLBACK_COLOR;
}
export function songColor(song: Song): string {
  return toqueColor(song.toque[0]);
}

export const CATEGORY_LABEL: Record<ToqueCategory, string> = {
  angola: 'Angola', regional: 'Regional', abada: 'Abadá', other: 'Outros ritmos',
};
export const CATEGORY_ORDER: ToqueCategory[] = ['abada', 'angola', 'regional', 'other'];

/** Berimbau strokes: chiado (the buzz, stone resting on the wire), dom (open, low), dim (stone pressed, high). */
export type Stroke = 'tch' | 'dom' | 'dim';

/**
 * Patterns the group has confirmed. A toque not listed here has no pattern yet, and every
 * screen says so instead of guessing one. Add a toque by adding its row.
 */
export const PATTERNS: Record<string, Stroke[]> = {
  'benguela': ['tch', 'tch', 'dom', 'dom', 'dim'],
  'sao-bento-abada': ['tch', 'dom', 'dim', 'dim', 'dom'],
};

export const STROKE_LABEL: Record<Stroke, string> = { tch: 'chiado', dom: 'grave', dim: 'agudo' };

/** Accent- and case-insensitive key, for sorting and searching Portuguese text. */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
export function byTitle(a: { title: string }, b: { title: string }): number {
  return fold(a.title).localeCompare(fold(b.title));
}

export function stanzas(text: string | null | undefined): string[][] {
  if (!text) return [];
  return text.trim().split(/\n\s*\n/).map(b => b.split('\n').map(l => l.trim()).filter(Boolean)).filter(b => b.length);
}

/** Lyrics as a flat list of lines, each with its translation and where its stanza starts. */
export interface LyricLine { pt: string; en: string; stanzaStart: boolean; }
export function lyricLines(song: Song): LyricLine[] {
  const pt = stanzas(song.lyrics); const en = stanzas(song.translation);
  return pt.flatMap((stanza, si) => stanza.map((line, li) => ({ pt: line, en: en[si]?.[li] ?? '', stanzaStart: li === 0 && si > 0 })));
}

export function firstLine(song: Song): string {
  return song.lyrics.split('\n').map(l => l.trim()).find(Boolean) ?? '';
}

/** A stable small number from an id, for varying the generated covers. */
export function seedOf(id: string): number {
  let n = 0;
  for (const ch of id) n = (n + ch.charCodeAt(0)) % 997;
  return n;
}

/** A bare YouTube id from an id or any common YouTube link, or null. */
export function youTubeId(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

/**
 * Translations mark Portuguese words kept as-is with asterisks (*roda*). Split a line into
 * runs so those words render in italics instead of showing the asterisks.
 */
export interface TextRun { text: string; em: boolean; }
export function emphasis(text: string): TextRun[] {
  return text.split(/(\*[^*]+\*)/).filter(Boolean).map(part =>
    part.length > 2 && part.startsWith('*') && part.endsWith('*') ? { text: part.slice(1, -1), em: true } : { text: part, em: false });
}
/** The same line with the asterisks dropped, for places that show plain text. */
export function plainText(text: string): string {
  return text.replace(/\*([^*]+)\*/g, '$1');
}
