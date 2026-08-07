import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { ToqueListComponent } from './toque-list.component';
import { DataService } from '../../../core/services/data.service';
import { Toque } from '../../../core/models/toque.model';

function makeToque(id: string, name: string, category: Toque['category']): Toque {
  return {
    id, name, category, description: '', tempo: 'medium', context: '',
    instruments: [], gameCharacter: '', videoLinks: [], relatedToques: [],
  };
}

const TOQUES = [
  makeToque('sao-bento-abada', 'São Bento Abadá', 'abada'),
  makeToque('benguela', 'Benguela', 'angola'),
  makeToque('sao-bento-grande', 'São Bento Grande', 'regional'),
];

function render() {
  TestBed.configureTestingModule({
    imports: [ToqueListComponent],
    providers: [
      provideRouter([]),
      {
        provide: DataService,
        useValue: {
          toques: signal(TOQUES),
          songsByToque: signal(new Map<string, unknown[]>()),
          videosByToque: signal(new Map<string, unknown[]>([['benguela', [{ id: 'v1' }]]])),
          toqueById: signal(new Map(TOQUES.map(t => [t.id, t]))),
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(ToqueListComponent);
  fixture.detectChanges();
  return fixture;
}

// The category strip used to be plain buttons with no roles, sitting next to a shared
// tab-bar that had them. There is one implementation now; these pin the semantics the
// hand-rolled copy was missing, and the ordering Hugo asked for.
describe('ToqueListComponent — the category strip is a real tablist', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('exposes the tabs to assistive tech, in the agreed order', () => {
    const el: HTMLElement = render().nativeElement;
    expect(el.querySelector('[role="tablist"]')).not.toBeNull();

    const tabs = [...el.querySelectorAll('[role="tab"]')];
    expect(tabs.map(t => t.textContent!.trim())).toEqual(['Toques', 'Abadá', 'Regional', 'Angola']);
    expect(tabs.map(t => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false', 'false']);
  });

  it('points every tab at the one results region it filters', () => {
    const el: HTMLElement = render().nativeElement;
    const panel = el.querySelector('#toque-results')!;
    expect(panel.getAttribute('role')).toBe('tabpanel');
    for (const tab of el.querySelectorAll('[role="tab"]')) {
      expect(tab.getAttribute('aria-controls')).toBe('toque-results');
    }
  });

  it('gives the tablist a roving tabindex, so Tab enters it once', () => {
    const el: HTMLElement = render().nativeElement;
    const indexes = [...el.querySelectorAll('[role="tab"]')].map(t => (t as HTMLElement).tabIndex);
    expect(indexes).toEqual([0, -1, -1, -1]);
  });

  it('filters the list when a tab is chosen', () => {
    const fixture = render();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelectorAll('#toque-results a').length).toBe(3);

    const abada = [...el.querySelectorAll('[role="tab"]')]
      .find(t => t.textContent!.trim() === 'Abadá') as HTMLButtonElement;
    abada.click();
    fixture.detectChanges();

    const links = [...el.querySelectorAll('#toque-results a')];
    expect(links.length).toBe(1);
    expect(links[0].textContent).toContain('São Bento Abadá');
    expect(abada.getAttribute('aria-selected')).toBe('true');
  });

  it('marks only the toques that actually have a video', () => {
    const el: HTMLElement = render().nativeElement;
    const marks = [...el.querySelectorAll('[title="Tem vídeo de demonstração"]')];
    expect(marks.length).toBe(1);
    expect(marks[0].closest('a')!.textContent).toContain('Benguela');
  });
});
