import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SearchService } from './search.service';
import { DataService } from './data.service';
import { Song } from '../models/song.model';
import { Toque } from '../models/toque.model';

function makeSong(partial: Partial<Song> & { id: string; title: string }): Song {
  return {
    toque: [],
    mestre: null,
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

function makeToque(partial: Partial<Toque> & { id: string; name: string }): Toque {
  return {
    category: 'other',
    description: '',
    tempo: 'medium',
    context: '',
    instruments: [],
    gameCharacter: '',
    videoLinks: [],
    relatedToques: [],
    ...partial,
  };
}

const SONGS: Song[] = [
  makeSong({ id: '1', title: 'Paranauê, Paranauá', lyrics: 'paranauê paranauá', composer: 'Tradicional' }),
  makeSong({ id: '2', title: 'É roda, vem jogar', lyrics: 'vem jogar capoeira', composer: 'Mestre Bimba' }),
  makeSong({
    id: '3',
    title: 'Malicia e manha (A capoeira é assim)',
    lyrics: 'a capoeira é assim',
    composer: 'Mestre Pastinha',
    toque: ['t1'],
  }),
];

const TOQUES: Toque[] = [
  makeToque({ id: 't1', name: 'Iúna' }),
  makeToque({ id: 't2', name: 'São Bento Grande da Regional' }),
  makeToque({ id: 't3', name: 'Maculelê' }),
];

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(() => {
    const fakeDataService = {
      songs: signal(SONGS),
      toques: signal(TOQUES),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: DataService, useValue: fakeDataService }],
    });

    service = TestBed.inject(SearchService);
  });

  it('returns all songs when the query is empty (existing behavior preserved)', () => {
    service.query.set('');
    expect(service.filteredSongs().length).toBe(SONGS.length);
  });

  it('matches an unaccented query against an accented title ("acao" -> title containing "é assim")', () => {
    service.query.set('capoeira');
    expect(service.filteredSongs().map(s => s.id)).toEqual(['2', '3']);
  });

  it('matches unaccented "paranaue" against the accented title "Paranauê, Paranauá"', () => {
    service.query.set('paranaue');
    expect(service.filteredSongs().map(s => s.id)).toEqual(['1']);
  });

  it('matches unaccented "iuna" against the toque "Iúna" in globalResults', () => {
    service.query.set('iuna');
    expect(service.globalResults().toques.map(t => t.id)).toEqual(['t1']);
  });

  it('still matches when the query itself is accented ("ção" style match: "é" matches "é")', () => {
    service.query.set('é assim');
    expect(service.filteredSongs().map(s => s.id)).toEqual(['3']);
  });

  it('matches composer field case- and accent-insensitively', () => {
    service.query.set('PASTINHA');
    expect(service.filteredSongs().map(s => s.id)).toEqual(['3']);
  });
});
