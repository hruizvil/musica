import { TestBed } from '@angular/core/testing';
import { provideRouter, RouterLink } from '@angular/router';
import { CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { ToqueDetailComponent } from './toque-detail.component';
import { DataService } from '../../../core/services/data.service';
import { Toque } from '../../../core/models/toque.model';

const BENGUELA: Toque = {
  id: 'benguela', name: 'Benguela', category: 'angola', description: '', tempo: 'slow', context: '',
  instruments: [], gameCharacter: '', videoLinks: [], relatedToques: [],
};

function render(songsByToque: Map<string, { id: string; title: string }[]>) {
  TestBed.configureTestingModule({
    imports: [ToqueDetailComponent],
    providers: [
      provideRouter([]),
      {
        provide: DataService,
        useValue: {
          toqueById: signal(new Map([['benguela', BENGUELA]])),
          songsByToque: signal(songsByToque),
          videosByToque: signal(new Map()),
        },
      },
    ],
  });
  // The song card and the player pull in Firebase and YouTube; the list only needs to exist.
  TestBed.overrideComponent(ToqueDetailComponent, {
    set: { imports: [RouterLink], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
  });
  const fixture = TestBed.createComponent(ToqueDetailComponent);
  fixture.componentRef.setInput('id', 'benguela');
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ToqueDetailComponent — the songs of a toque', () => {
  afterEach(() => TestBed.resetTestingModule());

  // The song page's ritmo tag and "Ver todas" link here, and the toque list shows a count
  // per toque, but this page never listed the songs.
  it('lists every song sung to the toque, A to Z', () => {
    const el = render(new Map([['benguela', [
      { id: 'b', title: 'Sabiá' }, { id: 'a', title: 'Paranauê' }, { id: 'c', title: 'Benedito' },
    ]]]));
    expect(el.textContent).toContain('Músicas · 3');
    const cards = [...el.querySelectorAll('app-song-card')];
    expect(cards.length).toBe(3);
    expect(cards.map(c => (c as unknown as { song: { title: string } }).song.title))
      .toEqual(['Benedito', 'Paranauê', 'Sabiá']);
  });

  it('says so when a toque has no songs yet', () => {
    const el = render(new Map());
    expect(el.querySelectorAll('app-song-card').length).toBe(0);
    expect(el.textContent).toContain('Ainda não há músicas');
  });
});
