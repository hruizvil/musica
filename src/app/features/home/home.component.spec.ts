import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { HomeComponent } from './home.component';
import { DataService } from '../../core/services/data.service';
import { FirebaseService } from '../../core/services/firebase.service';
import { Song } from '../../core/models/song.model';
import { Toque } from '../../core/models/toque.model';

function makeSong(id: string, title: string, toque: string[] = []): Song {
  return {
    id, title, toque,
    composer: null, album: null, lyrics: '', translation: null, themes: [],
    audioLinks: {}, notes: null, dateAdded: '2020-01-01',
  };
}

const ANGOLA: Toque = {
  id: 'angola', name: 'Angola', category: 'angola', description: '', tempo: 'slow',
  context: '', instruments: [], gameCharacter: '', videoLinks: [], relatedToques: [],
};

const SONG = makeSong('s1', 'Paranauê', ['angola']);

/** Reports the given viewport for the phone query only, so a test can pick a device.
 *  The test environment has no matchMedia at all, and HomeComponent's ngOnInit calls
 *  it, so every test in this file needs at least the default stub below. */
function stubMatchMedia(isPhone: boolean): () => void {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: query.includes('max-width: 767px') ? isPhone : false,
    media: query,
    onchange: null,
    addListener: () => undefined, removeListener: () => undefined,
    addEventListener: () => undefined, removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  return () => { window.matchMedia = original; };
}

let restoreMatchMedia: () => void = () => undefined;

beforeEach(() => {
  restoreMatchMedia = stubMatchMedia(false);
  localStorage.removeItem('install-banner-dismissed');
});

afterEach(() => {
  restoreMatchMedia();
  TestBed.resetTestingModule();
});

function render(favorites = new Set<string>()) {
  TestBed.configureTestingModule({
    imports: [HomeComponent],
    providers: [
      provideRouter([]),
      {
        provide: DataService,
        useValue: {
          songs: signal([SONG]),
          toques: signal([ANGOLA]),
          videos: signal([]),
          recentSongs: signal([SONG]),
          toqueById: signal(new Map([['angola', ANGOLA]])),
        },
      },
      {
        provide: FirebaseService,
        useValue: { learnedSongs: signal(new Set<string>()), favorites: signal(favorites) },
      },
    ],
  });
  const fixture = TestBed.createComponent(HomeComponent);
  fixture.detectChanges();
  return fixture;
}

describe('HomeComponent — recent songs use the shared card', () => {
  // Home used to duplicate the song-card markup inline, and the copy left out the
  // learned/favourite badges — so a favourited song showed a heart everywhere except
  // here. The duplication is the bug; asserting on the element keeps it from returning.
  it('renders app-song-card rather than its own copy of the markup', () => {
    const el: HTMLElement = render().nativeElement;
    expect(el.querySelectorAll('app-song-card').length).toBe(1);
  });

  it('shows the favourite heart on a recent song, which the inline copy never did', () => {
    const el: HTMLElement = render(new Set(['s1'])).nativeElement;
    const card = el.querySelector('app-song-card')!;
    expect(card.querySelector('[title="Favorita"]')).not.toBeNull();
  });

  it('leaves the heart off a song that is not favourited', () => {
    const el: HTMLElement = render().nativeElement;
    const card = el.querySelector('app-song-card')!;
    expect(card.querySelector('[title="Favorita"]')).toBeNull();
  });
});

describe('HomeComponent — "por que somos diferentes" cards are tappable', () => {
  const cards = (el: HTMLElement) =>
    [...el.querySelectorAll('h3')]
      .filter(h => /Tradução|Organizados|Curado/.test(h.textContent ?? ''))
      .map(h => h.closest('div.relative') as HTMLElement);

  it('stretches each card link over the whole card', () => {
    const found = cards(render().nativeElement);
    expect(found.length).toBe(3);

    const linked = found.filter(c => c.querySelector('a'));
    expect(linked.length).toBe(2);
    for (const card of linked) {
      // `relative` on the card plus `stretched-link` on the anchor is what makes the
      // whole card the hit area; either one missing silently shrinks it back to the text.
      expect(card.classList.contains('relative')).toBe(true);
      expect(card.querySelector('a')!.classList.contains('stretched-link')).toBe(true);
    }
  });

  it('drops the hover lift on the card that has nowhere to go', () => {
    const found = cards(render().nativeElement);
    const orphan = found.find(c => !c.querySelector('a'))!;
    // The lift reads as "this is tappable". A card with no destination must not claim it.
    expect(orphan.className).not.toContain('hover:-translate-y');
  });

  it('keeps the hover lift on the cards that do lead somewhere', () => {
    const found = cards(render().nativeElement);
    for (const card of found.filter(c => c.querySelector('a'))) {
      expect(card.className).toContain('hover:-translate-y');
    }
  });
});

// Chromium fires beforeinstallprompt on desktop too, so the card used to appear on a
// wide screen telling people to tap Share and add to their home screen — neither of
// which exists there.
describe('HomeComponent — the install card is for phones only', () => {
  function afterInstallPrompt(isPhone: boolean): HTMLElement {
    // Replaces the file-level desktop default; the outer afterEach puts it back.
    stubMatchMedia(isPhone);
    const fixture = render();
    window.dispatchEvent(new Event('beforeinstallprompt'));
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  it('offers it on a phone-sized viewport', () => {
    expect(afterInstallPrompt(true).textContent).toContain('Adicionar à tela inicial');
  });

  it('stays out of the way on desktop', () => {
    expect(afterInstallPrompt(false).textContent).not.toContain('Adicionar à tela inicial');
  });

  it('does not come back once dismissed', () => {
    localStorage.setItem('install-banner-dismissed', '1');
    expect(afterInstallPrompt(true).textContent).not.toContain('Adicionar à tela inicial');
  });
});
