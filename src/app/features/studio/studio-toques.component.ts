import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { Stroke, Toque, ToqueCategory } from '../../core/models/toque.model';
import { BerimbauSynth } from '../novo-design/novo-berimbau';
import { NovoIconComponent } from '../novo-design/novo-ui';
import { STROKE_NAME } from './studio.service';

const GROUPS: { key: ToqueCategory; label: string }[] = [
  { key: 'abada', label: 'Abadá' },
  { key: 'angola', label: 'Angola' },
  { key: 'regional', label: 'Regional' },
  { key: 'other', label: 'Other rhythms' },
];

/** Same beat as the public toque page, so a pattern sounds the same in both places. */
export const BEAT_MS = 420;

/** Every toque with its berimbau pattern, or a note that it has none yet. */
@Component({
  selector: 'app-studio-toques',
  standalone: true,
  imports: [RouterLink, NovoIconComponent],
  template: `
    <div class="max-w-[900px] px-4 md:px-8 py-5 md:py-7 pb-16 flex flex-col gap-5">
      <div>
        <h1 class="n-disp text-[21px] md:text-[24px] font-semibold">Toques</h1>
        <p class="m-0 mt-1 text-[14px] text-[var(--n-tx2)]">{{ withPattern() }} of {{ toques().length }} have a berimbau pattern. Open a toque to tap its pattern in and hear it.</p>
      </div>

      @for (g of groups(); track g.key) {
        <section class="flex flex-col gap-2">
          <h2 class="text-[11px] font-extrabold tracking-[0.08em] uppercase text-[var(--n-tx3)]">{{ g.label }}</h2>
          <div class="rounded-2xl border border-[var(--n-line)] bg-[var(--n-surf)] overflow-hidden">
            @for (t of g.items; track t.id; let first = $first) {
              <div class="flex items-center gap-3 px-3 md:px-4 py-2.5 border-[var(--n-line)]" [class.border-t]="!first">
                <button type="button" (click)="play(t)" [disabled]="!pattern(t.id)"
                  [attr.aria-label]="(playing() === t.id ? 'Stop ' : 'Play ') + t.name"
                  class="w-10 h-10 rounded-full grid place-items-center shrink-0 disabled:opacity-30"
                  [class]="playing() === t.id ? 'bg-[var(--n-acc)] text-[#101114]' : 'bg-[var(--n-raise)] text-[var(--n-tx)]'">
                  <app-novo-icon [name]="playing() === t.id ? 'pause' : 'play'" [size]="16" />
                </button>
                <a [routerLink]="['/admin/toques', t.id]" class="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-0.5 md:gap-3">
                  <span class="font-bold truncate md:w-[240px] md:shrink-0">{{ t.name }}</span>
                  @if (pattern(t.id); as seq) {
                    <span class="flex flex-wrap gap-1">
                      @for (s of seq; track $index; let i = $index) {
                        <span class="rounded-md px-1.5 py-px text-[12px] font-bold" [class]="chip(s, playing() === t.id && beat() === i)">{{ name[s].en }}</span>
                      }
                    </span>
                  } @else {
                    <span class="self-start rounded-full px-2.5 py-0.5 text-[11.5px] font-bold bg-[var(--n-warn-bg)] text-[var(--n-warn)]">No pattern yet</span>
                  }
                </a>
                <a [routerLink]="['/admin/toques', t.id]" class="text-[13px] font-bold text-[var(--n-tx2)] shrink-0 px-2 py-2">{{ pattern(t.id) ? 'Edit' : 'Add' }}</a>
              </div>
            }
          </div>
        </section>
      }
    </div>
  `,
})
export class StudioToquesComponent implements OnDestroy {
  private data = inject(DataService);
  readonly name = STROKE_NAME;
  readonly toques = this.data.toques;
  readonly withPattern = computed(() => this.toques().filter(t => this.pattern(t.id)).length);
  readonly groups = computed(() => GROUPS
    .map(g => ({ ...g, items: this.toques().filter(t => t.category === g.key) }))
    .filter(g => g.items.length));

  readonly playing = signal<string | null>(null);
  readonly beat = signal<number | null>(null);
  private synth = new BerimbauSynth();
  private timer?: ReturnType<typeof setInterval>;

  pattern(id: string): Stroke[] | null { return this.data.patterns()[id] ?? null; }

  chip(s: Stroke, on: boolean): string {
    if (on) return 'bg-[var(--n-acc)] text-[#101114]';
    return s === 'tch' ? 'bg-[var(--n-raise)] text-[var(--n-tx2)]' : s === 'dom' ? 'bg-[var(--n-low-bg)] text-[var(--n-low)]' : 'bg-[var(--n-acc-bg)] text-[var(--n-acc-tx)]';
  }

  async play(t: Toque): Promise<void> {
    if (this.playing() === t.id) { this.stop(); return; }
    const seq = this.pattern(t.id); if (!seq) return;
    this.stop();
    await this.synth.wake();
    this.playing.set(t.id);
    let i = 0;
    const tick = () => { this.beat.set(i); this.synth.strike(seq[i]); i = (i + 1) % seq.length; };
    tick();
    this.timer = setInterval(tick, BEAT_MS);
  }

  stop(): void {
    clearInterval(this.timer);
    this.timer = undefined;
    this.playing.set(null);
    this.beat.set(null);
  }

  ngOnDestroy(): void { this.stop(); this.synth.close(); }
}
