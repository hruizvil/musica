import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Song } from '../../core/models/song.model';
import { GAP_LABEL, Gap, StudioService, shortDate } from './studio.service';

type Filter = 'all' | 'video' | 'translation' | 'about';

const FILTERS: { key: Filter; label: string; gaps: Gap[] }[] = [
  { key: 'all', label: 'All', gaps: [] },
  { key: 'video', label: 'No video', gaps: ['video'] },
  { key: 'translation', label: 'Not translated', gaps: ['translation', 'chorusEn'] },
  { key: 'about', label: 'No "about" text', gaps: ['about', 'aboutEn'] },
];

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Every song, as a table on desktop and a list on phones. Filter and search live in the URL. */
@Component({
  selector: 'app-studio-songs',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="max-w-[1100px] px-4 md:px-8 py-5 md:py-7 pb-28 md:pb-10 flex flex-col gap-3.5">
      <div class="flex flex-wrap items-center gap-3">
        <h1 class="n-disp text-[21px] md:text-[24px] font-semibold flex-1">Songs</h1>
        <label class="w-full sm:w-[280px] h-11 px-3.5 rounded-full bg-[var(--n-surf)] border border-[var(--n-line)] flex items-center gap-2 text-[var(--n-tx3)] focus-within:border-[var(--n-acc)]">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
          <span class="sr-only">Search songs</span>
          <input type="search" [value]="q()" (input)="setQ($any($event.target).value)" placeholder="Search songs" class="flex-1 min-w-0 bg-transparent border-0 outline-none text-[15px] text-[var(--n-tx)] placeholder:text-[var(--n-tx3)]" />
        </label>
      </div>

      <div class="flex gap-2 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-1" role="group" aria-label="Filter">
        @for (f of filters; track f.key) {
          <button type="button" (click)="setFilter(f.key)" [attr.aria-pressed]="filter() === f.key"
            class="shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-bold border"
            [class]="filter() === f.key ? 'bg-[var(--n-acc-bg)] border-[var(--n-acc)] text-[var(--n-acc-tx)]' : 'bg-[var(--n-surf)] border-[var(--n-line)] text-[var(--n-tx2)]'">
            {{ f.label }} <span class="tabular-nums opacity-70">{{ countFor(f.key) }}</span>
          </button>
        }
      </div>

      <!-- Desktop: table -->
      <div class="hidden md:block rounded-2xl border border-[var(--n-line)] bg-[var(--n-surf)] overflow-hidden">
        <table class="w-full border-collapse text-[14px]">
          <thead>
            <tr class="text-left text-[11px] font-extrabold tracking-[0.08em] uppercase text-[var(--n-tx3)]">
              <th class="px-3.5 py-2.5 font-extrabold">Title</th><th class="px-3.5 py-2.5 font-extrabold">Toque</th>
              <th class="px-3.5 py-2.5 font-extrabold">Video</th><th class="px-3.5 py-2.5 font-extrabold">Translation</th>
              <th class="px-3.5 py-2.5 font-extrabold">About</th><th class="px-3.5 py-2.5 font-extrabold">Added</th>
            </tr>
          </thead>
          <tbody>
            @for (s of rows(); track s.id) {
              <tr (click)="open(s)" class="cursor-pointer border-t border-[var(--n-line)] hover:bg-[var(--n-bg)]">
                <td class="px-3.5 py-2.5 font-bold max-w-[340px] truncate"><a [routerLink]="['/admin/new/songs', s.id]" (click)="$event.stopPropagation()">{{ s.title }}</a></td>
                <td class="px-3.5 py-2.5 text-[var(--n-tx2)] max-w-[220px] truncate">{{ toques(s) }}</td>
                <td class="px-3.5 py-2.5"><span [class]="markClass(!has(s, 'video'))">{{ mark(!has(s, 'video')) }}</span></td>
                <td class="px-3.5 py-2.5"><span [class]="markClass(!has(s, 'translation') && !has(s, 'chorusEn'))">{{ mark(!has(s, 'translation') && !has(s, 'chorusEn')) }}</span></td>
                <td class="px-3.5 py-2.5"><span [class]="markClass(!has(s, 'about') && !has(s, 'aboutEn'))">{{ mark(!has(s, 'about') && !has(s, 'aboutEn')) }}</span></td>
                <td class="px-3.5 py-2.5 text-[var(--n-tx3)] whitespace-nowrap">{{ date(s.dateAdded) }}</td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="px-4 py-8 text-center text-[var(--n-tx2)]">No songs match.</td></tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Phone: list -->
      <div class="md:hidden rounded-2xl border border-[var(--n-line)] bg-[var(--n-surf)] overflow-hidden">
        @for (s of rows(); track s.id; let first = $first) {
          <a [routerLink]="['/admin/new/songs', s.id]" class="flex items-center gap-3 px-4 py-3 border-[var(--n-line)]" [class.border-t]="!first">
            <div class="flex-1 min-w-0">
              <div class="font-bold truncate">{{ s.title }}</div>
              <div class="text-[12.5px] text-[var(--n-tx3)] truncate">{{ toques(s) }} · {{ date(s.dateAdded) }}</div>
            </div>
            @if (studio.gaps(s)[0]; as g) {
              <span class="shrink-0 rounded-full px-2.5 py-0.5 text-[11.5px] font-bold bg-[var(--n-warn-bg)] text-[var(--n-warn)]">{{ label[g] }}</span>
            } @else {
              <span class="shrink-0 rounded-full px-2.5 py-0.5 text-[11.5px] font-bold bg-[var(--n-ok-bg)] text-[var(--n-ok)]">Complete</span>
            }
          </a>
        } @empty {
          <div class="px-4 py-8 text-center text-[var(--n-tx2)]">No songs match.</div>
        }
      </div>
    </div>
  `,
})
export class StudioSongsComponent {
  readonly studio = inject(StudioService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  readonly filters = FILTERS;
  readonly label = GAP_LABEL;

  private params = toSignal(this.route.queryParamMap.pipe(map(p => ({ filter: p.get('filter') ?? 'all', q: p.get('q') ?? '' }))), { initialValue: { filter: 'all', q: '' } });
  readonly filter = computed(() => (FILTERS.some(f => f.key === this.params().filter) ? this.params().filter : 'all') as Filter);
  readonly q = computed(() => this.params().q);

  readonly rows = computed(() => this.matching(this.filter(), this.q()));

  countFor(key: Filter): number { return this.matching(key, this.q()).length; }

  private matching(key: Filter, q: string): Song[] {
    const gaps = FILTERS.find(f => f.key === key)!.gaps;
    const needle = fold(q.trim());
    return this.studio.songs().filter(s =>
      (!gaps.length || this.studio.gaps(s).some(g => gaps.includes(g))) &&
      (!needle || fold(s.title).includes(needle) || fold(s.lyrics ?? '').includes(needle)));
  }

  has(s: Song, g: Gap): boolean { return this.studio.gaps(s).includes(g); }
  mark(ok: boolean): string { return ok ? '✓' : '—'; }
  markClass(ok: boolean): string { return 'font-extrabold ' + (ok ? 'text-[var(--n-ok)]' : 'text-[var(--n-warn)]'); }
  toques(s: Song): string { return s.toque.map(id => this.studio.toqueName(id)).join(', ') || 'No toque'; }
  date(d: string): string { return shortDate(d); }
  open(s: Song): void { this.router.navigate(['/admin/new/songs', s.id]); }

  setFilter(filter: Filter): void {
    this.router.navigate([], { queryParams: { filter: filter === 'all' ? null : filter }, queryParamsHandling: 'merge', replaceUrl: true });
  }
  setQ(q: string): void {
    this.router.navigate([], { queryParams: { q: q || null }, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
