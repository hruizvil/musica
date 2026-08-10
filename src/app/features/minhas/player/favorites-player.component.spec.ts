import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { FavoritesPlayerComponent } from './favorites-player.component';
import { DataService } from '../../../core/services/data.service';
import { FirebaseService } from '../../../core/services/firebase.service';
import { Song } from '../../../core/models/song.model';

function makeSong(id: string, title: string): Song {
  return {
    id, title, toque: ['angola'],
    composer: null, album: null, lyrics: '', translation: null, themes: [],
    audioLinks: { youtube: 'abc123' }, notes: null, dateAdded: '2020-01-01',
  };
}

const SONGS = ['a', 'b', 'c', 'd'].map((id, i) => makeSong(id, 'Song ' + (i + 1)));

/** Favourites arrive as an insertion-ordered Set, which is what gives the player its
 *  running order — the tests lean on that, so they build one the same way. */
function setup(favoriteIds: string[]) {
  const favorites = signal(new Set(favoriteIds));
  const toggleFavorite = (id: string) => {
    const next = new Set(favorites());
    if (next.has(id)) next.delete(id); else next.add(id);
    favorites.set(next);
    return Promise.resolve();
  };

  TestBed.configureTestingModule({
    imports: [FavoritesPlayerComponent],
    providers: [
      provideRouter([]),
      {
        provide: DataService,
        useValue: {
          songById: signal(new Map(SONGS.map(s => [s.id, s]))),
          toqueById: signal(new Map([['angola', { id: 'angola', name: 'Angola' }]])),
        },
      },
      {
        provide: FirebaseService,
        useValue: {
          currentUser: signal({ uid: 'u1' }),
          favorites,
          learnedSongs: signal(new Set<string>()),
          toggleFavorite,
        },
      },
    ],
  });

  const fixture = TestBed.createComponent(FavoritesPlayerComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, favorites };
}

describe('FavoritesPlayerComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('plays the favourites in the order they were starred', () => {
    const { component } = setup(['c', 'a', 'd']);
    expect(component.playlist().map(s => s.id)).toEqual(['c', 'a', 'd']);
  });

  it('starts on the first song and walks forward and back', () => {
    const { component } = setup(['a', 'b', 'c']);
    expect(component.activeSong()!.id).toBe('a');

    component.next();
    expect(component.activeSong()!.id).toBe('b');
    component.next();
    expect(component.activeSong()!.id).toBe('c');

    // Already at the end — next() must not wrap or fall off.
    component.next();
    expect(component.activeSong()!.id).toBe('c');

    component.prev();
    expect(component.activeSong()!.id).toBe('b');
  });

  it('ignores prev() on the first song', () => {
    const { component } = setup(['a', 'b']);
    component.prev();
    expect(component.activeSong()!.id).toBe('a');
  });

  it('drops a song from the list when it is un-starred', async () => {
    const { component } = setup(['a', 'b', 'c']);
    await component.unfavorite('b');
    expect(component.playlist().map(s => s.id)).toEqual(['a', 'c']);
  });

  // Un-starring what is playing used to be the awkward case: the song leaves the list
  // and the player would silently jump back to the top instead of carrying on.
  it('moves to the next song when the one playing is un-starred', async () => {
    const { component } = setup(['a', 'b', 'c']);
    component.play('b');
    await component.unfavorite('b');
    expect(component.activeSong()!.id).toBe('c');
  });

  it('falls back to the previous song when the last one is un-starred', async () => {
    const { component } = setup(['a', 'b', 'c']);
    component.play('c');
    await component.unfavorite('c');
    expect(component.activeSong()!.id).toBe('b');
  });

  it('keeps the song that is playing at the front when shuffle is turned on', () => {
    const { component } = setup(['a', 'b', 'c', 'd']);
    component.play('c');
    component.toggleShuffle();

    expect(component.playlist()[0].id).toBe('c');
    expect(component.activeSong()!.id).toBe('c');
    expect([...component.playlist()].map(s => s.id).sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('returns to starred order when shuffle is turned off', () => {
    const { component } = setup(['a', 'b', 'c']);
    component.toggleShuffle();
    component.toggleShuffle();
    expect(component.shuffled()).toBeNull();
    expect(component.playlist().map(s => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('keeps a shuffle stable while songs are starred and un-starred around it', async () => {
    const { component, favorites } = setup(['a', 'b', 'c']);
    component.toggleShuffle();
    const before = component.playlist().map(s => s.id);

    // A new favourite joins at the end rather than reshuffling what is already queued.
    favorites.set(new Set([...favorites(), 'd']));
    expect(component.playlist().map(s => s.id)).toEqual([...before, 'd']);

    await component.unfavorite(before[2]);
    expect(component.playlist().map(s => s.id)).toEqual([before[0], before[1], 'd']);
  });

  it('shows nothing to play when there are no favourites', () => {
    const { component, fixture } = setup([]);
    expect(component.playlist()).toEqual([]);
    expect(component.activeSong()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Você ainda não tem favoritas');
  });
});
