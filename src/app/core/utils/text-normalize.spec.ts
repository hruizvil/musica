import { normalizeForSearch } from './text-normalize';

describe('normalizeForSearch', () => {
  it('strips diacritics so an unaccented query matches accented text', () => {
    expect(normalizeForSearch('acao')).toBe(normalizeForSearch('ação'));
  });

  it('strips diacritics from a capitalized accented word', () => {
    expect(normalizeForSearch('iuna')).toBe(normalizeForSearch('Iúna'));
  });

  it('lowercases and strips diacritics regardless of input case', () => {
    expect(normalizeForSearch('PARANAUE')).toBe(normalizeForSearch('Paranauê'));
  });

  it('treats ç and c as equivalent', () => {
    expect(normalizeForSearch('c')).toBe(normalizeForSearch('ç'));
  });

  it('leaves an already-accented query able to match accented text', () => {
    expect(normalizeForSearch('ação')).toContain(normalizeForSearch('ção'));
  });
});
