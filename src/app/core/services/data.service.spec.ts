import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DataService } from './data.service';
import { FirebaseService, SongOverride } from './firebase.service';
import { Song } from '../models/song.model';

const OVERRIDES_CACHE_KEY = 'capoeira-overrides-cache';
const EXTRA_CACHE_KEY = 'capoeira-extra-cache';

function makeSong(partial: Partial<Song> & { id: string; title: string }): Song {
  return {
    toque: [],
    composer: null,
    album: null,
    lyrics: '',
    translation: null,
    themes: [],
    audioLinks: {},
    notes: null,
    dateAdded: '2020-01-01',
    ...partial,
  };
}

// Two base songs shipped in songs.json; '1' has been deleted in the admin (a
// `deleted` override lives in Firestore), '2' is live.
const BASE_SONGS: Song[] = [
  makeSong({ id: '1', title: 'Deleted In Admin' }),
  makeSong({ id: '2', title: 'Still Here' }),
];

describe('DataService — deleted-song flash', () => {
  let http: HttpTestingController;
  let resolveOverrides!: (m: Map<string, SongOverride>) => void;
  let resolveExtra!: (s: Song[]) => void;

  // Firestore stub whose two reads we resolve by hand, so we can inspect the
  // songs() list in the window *before* the network answers — exactly when the
  // flash used to happen.
  const fakeFb = {
    getSongOverrides: () => new Promise<Map<string, SongOverride>>(r => { resolveOverrides = r; }),
    getExtraSongs: () => new Promise<Song[]>(r => { resolveExtra = r; }),
  };

  beforeEach(() => localStorage.clear());
  afterEach(() => { http.verify(); localStorage.clear(); });

  function construct(): DataService {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: FirebaseService, useValue: fakeFb },
      ],
    });
    const service = TestBed.inject(DataService);
    http = TestBed.inject(HttpTestingController);
    // The three asset loads fire during construction; flush them so baseSongs is populated.
    http.expectOne('assets/data/songs.json').flush({ songs: BASE_SONGS });
    http.expectOne('assets/data/toques.json').flush({ toques: [] });
    http.expectOne('assets/data/videos.json').flush({ videos: [] });
    return service;
  }

  it('hides a cached-deleted song on first render, before Firestore resolves (the fix)', () => {
    // A previous visit cached the deleted override and one extra song.
    localStorage.setItem(OVERRIDES_CACHE_KEY, JSON.stringify([['1', { deleted: true } as SongOverride]]));
    localStorage.setItem(EXTRA_CACHE_KEY, JSON.stringify([makeSong({ id: 'E1', title: 'Extra From Cache' })]));

    const service = construct();

    // Firestore has NOT answered yet (resolveOverrides never called), yet the
    // deleted song is already gone and the cached extra is already present.
    const ids = service.songs().map(s => s.id);
    expect(ids).not.toContain('1');
    expect(ids).toContain('2');
    expect(ids).toContain('E1');
  });

  it('without a cache, the deleted song shows until Firestore answers — the flash the cache prevents', async () => {
    const service = construct();

    // No seed: overrides are empty, so the deleted base song is still visible.
    expect(service.songs().map(s => s.id)).toContain('1');

    // Firestore answers and it disappears — the visible "flash then vanish".
    resolveOverrides(new Map<string, SongOverride>([['1', { deleted: true }]]));
    resolveExtra([]);
    await new Promise(r => setTimeout(r));

    expect(service.songs().map(s => s.id)).not.toContain('1');
  });

  it('writes the server state to the cache so the next load can seed from it', async () => {
    const service = construct();

    resolveOverrides(new Map<string, SongOverride>([['1', { deleted: true }]]));
    resolveExtra([makeSong({ id: 'E9', title: 'Extra Persisted' })]);
    await new Promise(r => setTimeout(r));

    const cachedOverrides = JSON.parse(localStorage.getItem(OVERRIDES_CACHE_KEY)!);
    const cachedExtra = JSON.parse(localStorage.getItem(EXTRA_CACHE_KEY)!);
    expect(cachedOverrides).toEqual([['1', { deleted: true }]]);
    expect(cachedExtra.map((s: Song) => s.id)).toEqual(['E9']);
    expect(service.songs().map(s => s.id)).toContain('E9');
  });
});
