import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GAP_LABEL, Gap, StudioService, shortDate } from './studio.service';

/** The admin's landing page: what the library is missing, and what was added lately. */
@Component({
  selector: 'app-studio-overview',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="max-w-[1100px] px-4 md:px-8 py-5 md:py-7 pb-28 md:pb-10 flex flex-col gap-5 md:gap-6">
      <div>
        <div class="text-[var(--n-tx3)] font-semibold text-[14px]">{{ greeting() }}</div>
        <h1 class="n-disp text-[21px] md:text-[25px] font-semibold tracking-[-0.01em] mt-0.5">Here's the library today</h1>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-3.5">
        @for (t of tiles(); track t.label) {
          <a [routerLink]="'/admin/songs'" [queryParams]="t.filter ? { filter: t.filter } : {}"
             class="rounded-2xl border border-[var(--n-line)] bg-[var(--n-surf)] p-3.5 md:p-4 hover:border-[var(--n-acc)]">
            <div class="text-[11px] font-extrabold tracking-[0.08em] uppercase text-[var(--n-tx3)]">{{ t.label }}</div>
            <div class="n-disp text-[26px] md:text-[30px] font-semibold tabular-nums leading-tight mt-1" [class]="numColor(t.filter, t.value)">{{ t.value }}</div>
            <div class="text-[12.5px] text-[var(--n-tx3)] mt-0.5">{{ t.sub }}</div>
          </a>
        }
      </div>

      <div class="grid lg:grid-cols-[1.3fr_1fr] gap-4">
        <section class="rounded-2xl border border-[var(--n-line)] bg-[var(--n-surf)] overflow-hidden">
          <div class="flex items-center px-4 py-3"><h2 class="font-bold text-[15px] flex-1">Needs attention</h2><span class="text-[12px] text-[var(--n-tx3)]">newest first</span></div>
          @for (s of attention(); track s.id) {
            <a [routerLink]="['/admin/songs', s.id]" class="flex items-center gap-3 px-4 py-2.5 border-t border-[var(--n-line)] hover:bg-[var(--n-bg)]">
              <div class="flex-1 min-w-0">
                <div class="font-bold truncate">{{ s.title }}</div>
                <div class="text-[12.5px] text-[var(--n-tx3)] truncate">{{ toques(s.toque) }}</div>
              </div>
              <div class="hidden sm:flex gap-1.5 shrink-0">
                @for (g of studio.gaps(s).slice(0, 2); track g) { <span [class]="pill(g)">{{ label[g] }}</span> }
              </div>
              <span class="sm:hidden" [class]="pill(studio.gaps(s)[0])">{{ studio.gaps(s).length }} to do</span>
            </a>
          } @empty {
            <div class="px-4 py-6 border-t border-[var(--n-line)] text-[var(--n-tx2)]">Nothing missing. Every song is complete.</div>
          }
          <a routerLink="/admin/songs" class="block px-4 py-3 border-t border-[var(--n-line)] font-bold text-[14px] text-[var(--n-tx2)] hover:text-[var(--n-tx)]">See all songs →</a>
        </section>

        <section class="rounded-2xl border border-[var(--n-line)] bg-[var(--n-surf)] overflow-hidden">
          <div class="px-4 py-3"><h2 class="font-bold text-[15px]">Recently added</h2></div>
          @for (s of recent(); track s.id) {
            <a [routerLink]="['/admin/songs', s.id]" class="flex items-center gap-3 px-4 py-2.5 border-t border-[var(--n-line)] hover:bg-[var(--n-bg)]">
              <span class="w-9 h-9 rounded-lg grid place-items-center shrink-0 bg-[linear-gradient(135deg,#2a2c33,#4a3b14)] text-[var(--n-acc)] font-extrabold">♪</span>
              <div class="flex-1 min-w-0">
                <div class="font-bold truncate">{{ s.title }}</div>
                <div class="text-[12.5px] text-[var(--n-tx3)] truncate">{{ added(s.id, s.dateAdded) }}</div>
              </div>
            </a>
          }
        </section>
      </div>
    </div>
  `,
})
export class StudioOverviewComponent {
  readonly studio = inject(StudioService);
  readonly label = GAP_LABEL;

  readonly greeting = computed(() => {
    const h = new Date().getHours();
    const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    const name = this.studio.editor();
    return name ? `${part}, ${name}` : part;
  });

  readonly tiles = computed(() => {
    const c = this.studio.gapCounts();
    return [
      { label: 'Songs', value: this.studio.songs().length, sub: 'See them all', filter: '' },
      { label: 'No video yet', value: c.video, sub: 'No YouTube link', filter: 'video' },
      { label: 'Not translated', value: c.translation + c.chorusEn, sub: 'Lyrics or chorus', filter: 'translation' },
      { label: 'No "about" text', value: c.about + c.aboutEn, sub: 'History, tips, English', filter: 'about' },
    ];
  });

  readonly attention = computed(() => this.studio.songs().filter(s => this.studio.gaps(s).length).slice(0, 6));
  readonly recent = computed(() => this.studio.songs().slice(0, 5));

  toques(ids: string[]): string { return ids.map(id => this.studio.toqueName(id)).join(', ') || 'No toque'; }

  added(id: string, date: string): string {
    const m = this.studio.meta(id);
    return m?.by ? `${shortDate(date)} · last saved by ${m.by}` : shortDate(date);
  }

  numColor(filter: string, value: number): string {
    return !filter ? '' : value > 0 ? 'text-[var(--n-warn)]' : 'text-[var(--n-ok)]';
  }

  pill(g: Gap | undefined): string {
    const warn = g === 'video' || g === 'translation' || g === 'chorusEn';
    return 'rounded-full px-2.5 py-0.5 text-[11.5px] font-bold whitespace-nowrap ' +
      (warn ? 'bg-[var(--n-warn-bg)] text-[var(--n-warn)]' : 'bg-[var(--n-raise)] text-[var(--n-tx2)]');
  }
}
