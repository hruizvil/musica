/**
 * Portuguese song/toque titles are full of diacritics (ção, Iúna, São, refrão),
 * but phone keyboards make accents slow to type and users often skip them.
 * Normalizing both the query and the searched text to a diacritic-free,
 * lowercase form lets "acao" match "ação" and "iuna" match "Iúna", while an
 * accented query like "ção" still matches "ação" as before.
 */
export function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    // U+0300-U+036F is the combining-diacritics block NFD splits accents into.
    // Written as escapes on purpose: the literal characters are invisible in an
    // editor and easy to destroy with an encoding or line-ending rewrite.
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
