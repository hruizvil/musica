import { fitCount } from './action-bar.component';

// The measuring needs a real browser; the arithmetic does not, and the arithmetic is
// where a mistake silently hides an action that had room to stay.
describe('fitCount', () => {
  const gap = 8;
  const moreWidth = 40;
  const opts = (available: number, pinned = 0) => ({ available, gap, moreWidth, pinned });

  // Four icon buttons, one of them wider because it carries a speed badge.
  const SONG_BAR = [40, 58, 40, 40];

  it('keeps everything when the row is wide enough', () => {
    // 40+58+40+40 = 178, plus 3 gaps = 202
    expect(fitCount(SONG_BAR, opts(202))).toBe(4);
    expect(fitCount(SONG_BAR, opts(800))).toBe(4);
  });

  it('does not reserve room for ⋯ when nothing overflows', () => {
    // Exactly 202 fits without a ⋯ button, which is the point of checking the total
    // before doing any budgeting.
    expect(fitCount(SONG_BAR, opts(202))).toBe(4);
    // One pixel less and the ⋯ appears, which costs its own width plus a gap.
    expect(fitCount(SONG_BAR, opts(201))).toBeLessThan(4);
  });

  // Cumulative cost including gaps: 1→40, 2→106, 3→154, 4→202. Once ⋯ is on the row it
  // takes 48 of its own (40 + a gap), so the budget is available - 48.
  it('sheds actions as the row narrows', () => {
    expect(fitCount(SONG_BAR, opts(201))).toBe(2); // budget 153 → 3 would need 154
    expect(fitCount(SONG_BAR, opts(160))).toBe(2); // budget 112 → 2 costs 106
    expect(fitCount(SONG_BAR, opts(100))).toBe(1); // budget  52 → 2 would need 106
  });

  // Trading one 40px action for a 40px ⋯ frees nothing, so the row cannot sit at three.
  // That is the arithmetic being honest, not a rounding slip: any width wide enough for
  // three plus ⋯ is already wide enough for all four without one.
  it('skips a three-action state, because ⋯ costs what the action it replaces cost', () => {
    const counts = new Set(
      Array.from({ length: 400 }, (_, i) => fitCount(SONG_BAR, opts(i + 1))),
    );
    expect(counts.has(4)).toBe(true);
    expect(counts.has(2)).toBe(true);
    expect(counts.has(3)).toBe(false);
  });

  it('drops to a single action on a very narrow row', () => {
    expect(fitCount(SONG_BAR, opts(100))).toBe(1); // budget 52 → only the first 40 fits
  });

  it('can collapse everything when there is no room even for one', () => {
    expect(fitCount(SONG_BAR, opts(60))).toBe(0); // budget 12 → nothing fits
  });

  it('never collapses a pinned action, even where the row runs tight', () => {
    // Transport: prev and next are pinned, shuffle is not.
    const transport = [40, 40, 40];
    expect(fitCount(transport, opts(60, 2))).toBe(2);
    // Without pinning, the same width would have hidden them both.
    expect(fitCount(transport, opts(60, 0))).toBe(0);
  });

  it('does not claim to show more actions than exist', () => {
    expect(fitCount([40, 40], opts(30, 5))).toBe(2);
  });

  it('shows everything before a measurement has happened', () => {
    // available of 0 means "not measured yet" — collapsing on a guess is worse than
    // one frame of a row that is too full.
    expect(fitCount(SONG_BAR, opts(0))).toBe(4);
  });

  it('handles an empty bar', () => {
    expect(fitCount([], opts(500))).toBe(0);
  });
});
