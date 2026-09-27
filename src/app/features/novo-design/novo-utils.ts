import { Song } from '../../core/models/song.model';
import { ToqueCategory, ToqueSpeed } from '../../core/models/toque.model';

export const TEMPO_LABEL: Record<ToqueSpeed, string> = {
  slow: 'Lento', medium: 'Médio', fast: 'Rápido', variable: 'Variável',
};

export const CATEGORY_LABEL: Record<ToqueCategory, string> = {
  angola: 'Angola', regional: 'Regional', abada: 'Abadá', other: 'Outros ritmos',
};

export const CATEGORY_ORDER: ToqueCategory[] = ['angola', 'regional', 'abada', 'other'];

/** Accent- and case-insensitive key, for sorting and searching Portuguese titles. */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function byTitle(a: { title: string }, b: { title: string }): number {
  return fold(a.title).localeCompare(fold(b.title));
}

export function stanzas(text: string | null | undefined): string[][] {
  if (!text) return [];
  return text.trim().split(/\n\s*\n/).map(block => block.split('\n').map(l => l.trim()).filter(Boolean));
}

export function lineCount(song: Song): number {
  return song.lyrics.split('\n').filter(l => l.trim()).length;
}

/** A word worth hiding in practice mode: long enough to be a real word to remember,
 *  not a filler like "que" or "meu". Every second qualifying word is hidden, so a line
 *  keeps enough context to be recalled. */
export function isPracticeWord(word: string): boolean {
  return word.replace(/[^\p{L}]/gu, '').length >= 5;
}
