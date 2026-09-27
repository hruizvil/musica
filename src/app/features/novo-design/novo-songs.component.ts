import { Component, ElementRef, afterNextRender, computed, inject, input, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { FirebaseService } from '../../core/services/firebase.service';
import { Song } from '../../core/models/song.model';
import { NovoHeartComponent, NovoIconComponent, NovoStatusComponent, NovoTempoComponent } from './novo-ui';
import { CATEGORY_LABEL, CATEGORY_ORDER, byTitle, fold, lineCount } from './novo-utils';

type Lista = 'todas' | 'favoritas' | 'aprendidas' | 'pendentes';

/** Estúdio library: every song as a sortable, filterable table. Filters live in the URL,
 *  so a filtered list can be bookmarked or shared, and Back undoes a filter. */
@Component({
  selector: 'app-novo-songs',
  standalone: true,
  imports: [RouterLink, NovoHeartComponent, NovoIconComponent, NovoStatusComponent, NovoTempoComponent],
  template: `
    <div class="max-w-[1180px] mx-auto px-4 md:px-8 py-6 md:py-8 flex flex-col gap-5">

      <div class="flex items-end justify-between gap-4">
        <div class="flex flex-col gap-1.5">
          <p class="n-label hidden md:block">Biblioteca</p>
          <h1 class="m-0 text-3xl md:text-[32px] font-semibold tracking-[-0.03em]">{{ heading() }}</h1>
        </div>
        <p class="m-0 text-sm text-[#5f6778]">{{ rows().length }} de {{ data.songs().length }}</p>
      </div>

      <div class="flex flex-col lg:flex-row lg:items-center gap-3 lg:flex-wrap">
        <label class="lg:w-80 h-11 md:h-10 px-3 rounded-[10px] border border-[#e3e6eb] bg-white flex items-center gap-2 text-[#5f6778] focus-within:border-[#2146d8]">
          <app-novo-icon name="search" [size]="16" />
          <span class="sr-only">Filtrar cantigas</span>
          <input #searchInput type="search" [value]="q() ?? ''" (input)="setParam('q', searchInput.value)"
                 placeholder="Título, letra, tradução ou tema"
                 class="flex-1 min-w-0 border-0 outline-none bg-transparent text-base md:text-sm text-[#0f1115]" />
        </label>

        <div role="group" aria-label="Lista" class="flex gap-0.5 p-1 rounded-[10px] bg-[#eceef2] overflow-x-auto">
          @for (opt of listas; track opt.id) {
            <button type="button" (click)="setParam('lista', opt.id === 'todas' ? '' : opt.id)" [attr.aria-pressed]="list() === opt.id"
              class="shrink-0 h-9 md:h-8 px-3 rounded-lg text-[13px] font-semibold whitespace-nowrap"
              [class]="list() === opt.id ? 'bg-white text-[#0f1115] shadow-[0_1px_2px_rgba(15,17,21,0.08)]' : 'text-[#5f6778]'">
              {{ opt.label }} <span class="n-mono font-normal">{{ counts()[opt.id] }}</span>
            </button>
          }
        </div>

        <label class="flex items-center gap-2 text-[13px] text-[#434a5a]">
          <span class="shrink-0">Toque</span>
          <select (change)="setParam('toque', $any($event.target).value)"
            class="h-10 md:h-9 px-3 rounded-[10px] border border-[#e3e6eb] bg-white text-sm text-[#0f1115] min-w-0 flex-1">
            <option value="" [selected]="!toque()">Todos</option>
            @for (group of toqueGroups(); track group.label) {
              <optgroup [label]="group.label">
                @for (t of group.toques; track t.id) {
                  <option [value]="t.id" [selected]="toque() === t.id">{{ t.name }} ({{ t.count }})</option>
                }
              </optgroup>
            }
          </select>
        </label>
      </div>

      @if ((list() === 'favoritas' || list() === 'aprendidas' || list() === 'pendentes') && !firebase.currentUser() && !firebase.pendingSignedIn()) {
        <div class="bg-white border border-dashed border-[#c9ced8] rounded-[14px] p-6 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <p class="m-0 text-[15px] text-[#434a5a]">Sua fila e suas cantigas aprendidas ficam salvas na sua conta.</p>
          <a routerLink="/login" [queryParams]="{ returnUrl: '/novo/musicas?lista=' + list() }" class="h-10 px-4 rounded-[10px] bg-[#0f1115] text-white text-sm font-semibold inline-flex items-center justify-center">Entrar com Google</a>
        </div>
      } @else {
        <!-- Desktop and tablet: the table. -->
        <div class="hidden md:block bg-white border border-[#e3e6eb] rounded-[14px] overflow-hidden">
          <table class="w-full border-collapse">
            <caption class="sr-only">Cantigas</caption>
            <thead class="bg-[#fafbfc]">
              <tr>
                <th scope="col" class="w-12"><span class="sr-only">Na fila</span></th>
                @for (col of columns; track col.id) {
                  <th scope="col" class="px-3 py-2.5 n-label font-normal" [class.text-right]="col.id === 'data'" [class.hidden]="col.wide" [class.lg:table-cell]="col.wide"
                      [attr.aria-sort]="sort() === col.id ? 'ascending' : (sort() === '-' + col.id ? 'descending' : null)">
                    @if (col.sortable) {
                      <button type="button" (click)="toggleSort(col.id)" class="inline-flex items-center gap-1 uppercase hover:text-[#0f1115]">
                        {{ col.label }}
                        @if (sort() === col.id) { <span aria-hidden="true">↑</span> }
                        @if (sort() === '-' + col.id) { <span aria-hidden="true">↓</span> }
                      </button>
                    } @else {
                      {{ col.label }}
                    }
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (song of rows(); track song.id) {
                <tr class="border-t border-[#e3e6eb] hover:bg-[#fafbfc]">
                  <td class="pl-3 pr-1 py-1"><app-novo-heart [songId]="song.id" [title]="song.title" /></td>
                  <td class="px-3 py-2.5"><a [routerLink]="['/novo/musicas', song.id]" class="text-sm font-semibold text-[#0f1115] hover:text-[#2146d8]">{{ song.title }}</a></td>
                  <td class="px-3 py-2.5 text-sm text-[#434a5a] max-w-[200px]">
                    {{ toqueName(song.toque[0]) }}
                    @if (song.toque.length > 1) { <span class="text-xs text-[#5f6778]" [attr.title]="otherToques(song)">+{{ song.toque.length - 1 }}</span> }
                  </td>
                  <td class="px-3 py-2.5"><app-novo-tempo [toque]="data.toqueById().get(song.toque[0])" /></td>
                  <td class="px-3 py-2.5 text-[13px] text-[#434a5a] whitespace-nowrap hidden lg:table-cell">{{ lines(song) }} linhas</td>
                  <td class="px-3 py-2.5 text-[#5f6778] hidden lg:table-cell">
                    @if (song.audioLinks.youtube) { <app-novo-icon name="video" [size]="16" /><span class="sr-only">Tem vídeo</span> } @else { <span aria-hidden="true">—</span><span class="sr-only">Sem vídeo</span> }
                  </td>
                  <td class="px-3 py-2.5"><app-novo-status [songId]="song.id" /></td>
                  <td class="px-4 py-2.5 text-right n-mono text-xs text-[#5f6778] whitespace-nowrap">{{ song.dateAdded }}</td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="px-4 py-12 text-center text-sm text-[#5f6778]">{{ emptyText() }}</td></tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Phone: the same rows as a list; the columns that matter stay. -->
        <ul class="md:hidden m-0 p-0 list-none bg-white border border-[#e3e6eb] rounded-[14px] overflow-hidden">
          @for (song of rows(); track song.id) {
            <li class="relative flex items-center gap-2 pl-4 pr-1 py-2.5 border-t first:border-t-0 border-[#e3e6eb]">
              <a [routerLink]="['/novo/musicas', song.id]" class="flex-1 min-w-0 flex flex-col gap-1 after:absolute after:inset-0">
                <span class="text-[15px] font-semibold text-[#0f1115]">{{ song.title }}</span>
                <span class="flex items-center gap-2 flex-wrap"><span class="text-[13px] text-[#5f6778]">{{ toqueName(song.toque[0]) }}</span><app-novo-status [songId]="song.id" /></span>
              </a>
              <span class="relative z-10"><app-novo-heart [songId]="song.id" [title]="song.title" /></span>
            </li>
          } @empty {
            <li class="px-4 py-12 text-center text-sm text-[#5f6778]">{{ emptyText() }}</li>
          }
        </ul>
      }
    </div>
  `,
})
export class NovoSongsComponent {
  readonly data = inject(DataService);
  readonly firebase = inject(FirebaseService);
  private router = inject(Router);

  // Bound from the query string (withComponentInputBinding).
  q = input<string>();
  toque = input<string>();
  lista = input<string>();
  ordem = input<string>();
  buscar = input<string>();

  private searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  readonly listas: { id: Lista; label: string }[] = [
    { id: 'todas', label: 'Todas' }, { id: 'favoritas', label: 'Na fila' },
    { id: 'aprendidas', label: 'Aprendidas' }, { id: 'pendentes', label: 'Não aprendidas' },
  ];

  readonly columns = [
    { id: 'titulo', label: 'Título', sortable: true, wide: false },
    { id: 'toque', label: 'Toque', sortable: true, wide: false },
    { id: 'andamento', label: 'Andamento', sortable: true, wide: false },
    { id: 'linhas', label: 'Letra', sortable: true, wide: true },
    { id: 'video', label: 'Vídeo', sortable: false, wide: true },
    { id: 'status', label: 'Status', sortable: false, wide: false },
    { id: 'data', label: 'Adicionada', sortable: true, wide: false },
  ];

  readonly list = computed<Lista>(() => {
    const l = this.lista();
    return l === 'favoritas' || l === 'aprendidas' || l === 'pendentes' ? l : 'todas';
  });
  readonly sort = computed(() => this.ordem() || 'titulo');

  readonly heading = computed(() => ({
    todas: 'Músicas', favoritas: 'Fila de prática', aprendidas: 'Aprendidas', pendentes: 'Ainda não aprendidas',
  })[this.list()]);

  readonly counts = computed(() => {
    const fav = this.firebase.favorites(); const lrn = this.firebase.learnedSongs(); const all = this.data.songs();
    return {
      todas: all.length,
      favoritas: all.filter(s => fav.has(s.id)).length,
      aprendidas: all.filter(s => lrn.has(s.id)).length,
      pendentes: all.filter(s => !lrn.has(s.id)).length,
    } as Record<Lista, number>;
  });

  readonly toqueGroups = computed(() => {
    const byToque = this.data.songsByToque();
    return CATEGORY_ORDER.map(cat => ({
      label: CATEGORY_LABEL[cat],
      toques: this.data.toques().filter(t => t.category === cat && byToque.has(t.id))
        .map(t => ({ id: t.id, name: t.name, count: byToque.get(t.id)!.length })),
    })).filter(g => g.toques.length);
  });

  readonly rows = computed<Song[]>(() => {
    const fav = this.firebase.favorites(); const lrn = this.firebase.learnedSongs();
    const q = fold(this.q() ?? '').trim(); const tq = this.toque();
    let list = this.data.songs().filter(s => {
      if (tq && !s.toque.includes(tq)) return false;
      const l = this.list();
      if (l === 'favoritas' && !fav.has(s.id)) return false;
      if (l === 'aprendidas' && !lrn.has(s.id)) return false;
      if (l === 'pendentes' && lrn.has(s.id)) return false;
      if (q) {
        const hay = fold([s.title, s.lyrics, s.translation ?? '', s.themes.join(' '), ...s.toque.map(t => this.toqueName(t))].join(' '));
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    // The queue keeps the order things were starred in, unless a column was chosen.
    if (this.list() === 'favoritas' && !this.ordem()) {
      const order = [...fav];
      return list.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    }
    const key = this.sort().replace('-', ''); const dir = this.sort().startsWith('-') ? -1 : 1;
    const bpm = (s: Song) => this.data.toqueById().get(s.toque[0])?.tempoBPM?.min ?? 999;
    const cmp: Record<string, (a: Song, b: Song) => number> = {
      titulo: byTitle,
      toque: (a, b) => fold(this.toqueName(a.toque[0])).localeCompare(fold(this.toqueName(b.toque[0]))) || byTitle(a, b),
      andamento: (a, b) => bpm(a) - bpm(b) || byTitle(a, b),
      linhas: (a, b) => lineCount(a) - lineCount(b) || byTitle(a, b),
      data: (a, b) => a.dateAdded.localeCompare(b.dateAdded) || byTitle(a, b),
    };
    list = [...list].sort((a, b) => dir * (cmp[key] ?? byTitle)(a, b));
    return list;
  });

  readonly emptyText = computed(() => {
    if (this.q()) return 'Nenhuma cantiga com "' + this.q() + '".';
    if (this.list() === 'favoritas') return 'Sua fila está vazia. Toque no coração de uma cantiga para pô-la aqui.';
    if (this.list() === 'aprendidas') return 'Nenhuma cantiga marcada como aprendida ainda.';
    return 'Nenhuma cantiga com esses filtros.';
  });

  constructor() {
    // Arriving from a "Buscar" link: put the cursor in the filter straight away.
    afterNextRender(() => {
      if (this.buscar()) this.searchInput()?.nativeElement.focus();
    });
  }

  setParam(key: string, value: string): void {
    void this.router.navigate([], {
      queryParams: { [key]: value || null, buscar: null },
      queryParamsHandling: 'merge',
      replaceUrl: key === 'q',
    });
  }

  toggleSort(col: string): void {
    const next = this.sort() === col ? '-' + col : col;
    this.setParam('ordem', next === 'titulo' ? '' : next);
  }

  toqueName(id: string): string { return this.data.toqueById().get(id)?.name ?? id; }
  otherToques(song: Song): string { return song.toque.slice(1).map(t => this.toqueName(t)).join(', '); }
  lines(song: Song): number { return lineCount(song); }
}
