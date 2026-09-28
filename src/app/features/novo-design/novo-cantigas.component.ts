import { Component, ElementRef, afterNextRender, computed, inject, input, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { FirebaseService } from '../../core/services/firebase.service';
import { NovoIconComponent } from './novo-ui';
import { NovoSongRowComponent } from './novo-parts';
import { CATEGORY_LABEL, CATEGORY_ORDER, byTitle, fold } from './novo-data';

type Lista = 'todas' | 'curtidas' | 'aprendidas';

/** Every song: search by title or any verse, in Portuguese or English; filter by toque or list. */
@Component({
  selector: 'app-novo-cantigas',
  standalone: true,
  imports: [RouterLink, NovoIconComponent, NovoSongRowComponent],
  template: `
    <div class="max-w-[1100px] mx-auto px-4 md:px-10 py-6 md:py-9 flex flex-col gap-5">
      <div class="flex items-end justify-between gap-4">
        <h1 class="m-0 n-disp text-3xl md:text-5xl font-bold tracking-[-0.04em]">Cantigas</h1>
        <span class="text-sm text-[var(--n-tx3)] tabular-nums">{{ rows().length }} de {{ data.songs().length }}</span>
      </div>

      <label class="h-12 md:h-14 px-4 md:px-5 rounded-2xl bg-[var(--n-surf)] border-2 border-[var(--n-line)] focus-within:border-[var(--n-acc)] flex items-center gap-3 text-[var(--n-tx3)]">
        <app-novo-icon name="search" [size]="20" />
        <span class="sr-only">Buscar cantigas</span>
        <input #search id="novo-cantigas-q" type="search" [value]="q() ?? ''" (input)="set('q', search.value)"
               placeholder="Título ou qualquer verso, em português ou inglês"
               class="flex-1 min-w-0 bg-transparent border-0 outline-none text-base md:text-lg text-[var(--n-tx)] placeholder:text-[var(--n-tx3)]" />
      </label>

      <div class="flex flex-wrap items-center gap-2">
        @for (opt of listas; track opt.id) {
          <button type="button" (click)="set('lista', opt.id === 'todas' ? '' : opt.id)" [attr.aria-pressed]="list() === opt.id"
            class="h-10 px-4 rounded-full text-sm font-bold border transition-colors"
            [class]="list() === opt.id ? 'bg-[var(--n-tx)] text-[var(--n-bg)] border-[var(--n-tx)]' : 'bg-transparent text-[var(--n-tx)] border-[var(--n-line)]'">{{ opt.label }}</button>
        }
        <label class="flex items-center gap-2 text-sm text-[var(--n-tx2)] ml-auto">
          <span>Toque</span>
          <select id="novo-cantigas-toque" (change)="set('toque', $any($event.target).value)" class="h-10 px-3 rounded-xl border border-[var(--n-line)] bg-[var(--n-surf)] text-sm text-[var(--n-tx)] max-w-[220px]">
            <option value="" [selected]="!toque()">Todos</option>
            @for (g of toqueGroups(); track g.label) {
              <optgroup [label]="g.label">
                @for (t of g.toques; track t.id) { <option [value]="t.id" [selected]="toque() === t.id">{{ t.name }} ({{ t.n }})</option> }
              </optgroup>
            }
          </select>
        </label>
      </div>

      @if (list() !== 'todas' && !firebase.currentUser() && !firebase.pendingSignedIn()) {
        <div class="p-6 rounded-2xl border border-dashed border-[var(--n-line)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p class="m-0 text-[15px] text-[var(--n-tx2)]">Suas curtidas e aprendidas ficam salvas na sua conta.</p>
          <a routerLink="/login" [queryParams]="{ returnUrl: '/novo/cantigas?lista=' + list() }" class="h-11 px-5 rounded-xl bg-[var(--n-acc)] text-[#1a1400] font-extrabold inline-flex items-center justify-center hover:no-underline">Entrar com Google</a>
        </div>
      } @else {
        <div class="flex flex-col gap-0.5">
          @for (s of rows(); track s.id; let i = $index) {
            <app-novo-song-row [song]="s" [n]="i + 1" [queue]="rowIds()" [showStatus]="list() !== 'todas'" />
          } @empty {
            <p class="m-0 py-12 text-center text-[15px] text-[var(--n-tx2)]">{{ q() ? 'Nenhuma cantiga com “' + q() + '”.' : 'Nenhuma cantiga com esses filtros.' }}</p>
          }
        </div>
      }
    </div>
  `,
})
export class NovoCantigasComponent {
  readonly data = inject(DataService);
  readonly firebase = inject(FirebaseService);
  private router = inject(Router);

  q = input<string>();
  toque = input<string>();
  lista = input<string>();
  buscar = input<string>();
  private search = viewChild<ElementRef<HTMLInputElement>>('search');

  readonly listas: { id: Lista; label: string }[] = [{ id: 'todas', label: 'Todas' }, { id: 'curtidas', label: 'Curtidas' }, { id: 'aprendidas', label: 'Aprendidas' }];
  readonly list = computed<Lista>(() => (this.lista() === 'curtidas' || this.lista() === 'aprendidas' ? this.lista() as Lista : 'todas'));

  readonly toqueGroups = computed(() => {
    const by = this.data.songsByToque();
    return CATEGORY_ORDER.map(cat => ({
      label: CATEGORY_LABEL[cat],
      toques: this.data.toques().filter(t => t.category === cat && by.has(t.id)).map(t => ({ id: t.id, name: t.name, n: by.get(t.id)!.length })),
    })).filter(g => g.toques.length);
  });

  readonly rows = computed(() => {
    const fav = this.firebase.favorites(); const lrn = this.firebase.learnedSongs();
    const q = fold(this.q() ?? '').trim(); const tq = this.toque();
    return this.data.songs().filter(s => {
      if (tq && !s.toque.includes(tq)) return false;
      if (this.list() === 'curtidas' && !fav.has(s.id)) return false;
      if (this.list() === 'aprendidas' && !lrn.has(s.id)) return false;
      if (q) {
        const hay = fold([s.title, s.lyrics, s.translation ?? '', s.themes.join(' ')].join(' '));
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort(byTitle);
  });
  readonly rowIds = computed(() => this.rows().map(s => s.id));

  constructor() {
    afterNextRender(() => { if (this.buscar()) this.search()?.nativeElement.focus(); });
  }

  set(key: string, value: string): void {
    void this.router.navigate([], { queryParams: { [key]: value || null, buscar: null }, queryParamsHandling: 'merge', replaceUrl: key === 'q' });
  }
}
