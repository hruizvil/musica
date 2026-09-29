import { Component, OnDestroy, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { Stroke } from '../../core/models/toque.model';
import { BerimbauSynth } from '../novo-design/novo-berimbau';
import { NovoIconComponent, NovoPatternComponent } from '../novo-design/novo-ui';
import { STROKE_NAME, StudioService, shortDate } from './studio.service';
import { BEAT_MS } from './studio-toques.component';

const KEYS: Record<string, Stroke> = { b: 'tch', l: 'dom', h: 'dim', '1': 'tch', '2': 'dom', '3': 'dim' };
const MAX_STROKES = 24;

/**
 * Tapping in one toque's berimbau pattern: three big stroke buttons, the pattern as it
 * will look on the site, and a play button that loops it with the site's own berimbau
 * sound. One cycle is enough; the site repeats it.
 */
@Component({
  selector: 'app-studio-toque-editor',
  standalone: true,
  imports: [RouterLink, NovoIconComponent, NovoPatternComponent],
  host: { '(document:keydown)': 'onKey($event)', '(window:beforeunload)': 'onUnload($event)' },
  template: `
    @if (toque(); as t) {
      <div class="sticky top-14 md:top-0 z-20 bg-[var(--n-surf)] border-b border-[var(--n-line)]">
        <div class="h-14 flex items-center gap-2 md:gap-3 px-2 md:px-6">
          <a routerLink="/admin/toques" class="md:hidden w-10 h-10 grid place-items-center rounded-full" aria-label="Back to toques"><app-novo-icon name="back" [size]="21" /></a>
          <a routerLink="/admin/toques" class="hidden md:inline text-[var(--n-tx3)] hover:text-[var(--n-tx)]">Toques</a>
          <span class="hidden md:inline text-[var(--n-tx3)]">/</span>
          <b class="truncate min-w-0 flex-1 md:flex-none">{{ t.name }}</b>
          @if (dirty()) {
            <span class="hidden sm:inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-bold bg-[var(--n-acc-bg)] text-[var(--n-acc-tx)] shrink-0">● Unsaved</span>
          }
          <div class="hidden md:block flex-1"></div>
          <a [href]="'/toques/' + t.id" target="_blank" rel="noopener" class="hidden md:inline-flex items-center gap-1.5 rounded-full border border-[var(--n-line)] px-4 py-2 text-[13px] font-bold hover:border-[var(--n-tx3)]">View on site <app-novo-icon name="external" [size]="14" /></a>
          <button type="button" (click)="save()" [disabled]="saving() || !dirty()"
            class="rounded-full bg-[var(--n-acc)] text-[#101114] px-5 py-2 text-[14px] font-bold disabled:opacity-50 shrink-0 hover:brightness-105">{{ saving() ? 'Saving…' : 'Save' }}</button>
        </div>
      </div>

      <div class="max-w-[760px] px-4 md:px-8 py-5 md:py-7 pb-16 flex flex-col gap-6">
        <p class="m-0 text-[14.5px] text-[var(--n-tx2)]">Tap the strokes in the order the berimbau plays them. One cycle is enough; the site repeats it.<span class="hidden md:inline"> On a keyboard: <b>B</b> buzz, <b>L</b> low, <b>H</b> high, <b>Backspace</b> removes the last one.</span></p>

        <!-- The pattern, as visitors will see it -->
        <section class="rounded-2xl border border-[var(--n-line)] bg-[var(--n-surf)] p-4 md:p-6 flex flex-col gap-4">
          <div class="flex items-center gap-3">
            <button type="button" (click)="togglePlay()" [disabled]="!strokes().length" [attr.aria-label]="playing() ? 'Stop' : 'Play the pattern'"
              class="w-12 h-12 rounded-full grid place-items-center shrink-0 disabled:opacity-30"
              [class]="playing() ? 'bg-[var(--n-acc)] text-[#101114]' : 'bg-[var(--n-tx)] text-[var(--n-surf)]'">
              <app-novo-icon [name]="playing() ? 'pause' : 'play'" [size]="19" />
            </button>
            <div class="flex-1 min-w-0">
              <div class="font-bold">{{ strokes().length ? strokes().length + ' strokes' : 'No pattern yet' }}</div>
              <div class="text-[12.5px] text-[var(--n-tx3)]">{{ savedLine() }}</div>
            </div>
          </div>
          <div class="overflow-x-auto -mx-1 px-1 pb-1">
            <app-novo-pattern [toqueId]="t.id" [pattern]="strokes()" [size]="strokes().length > 10 ? 'm' : 'l'" [active]="beat()" />
          </div>
          @if (strokes().length) {
            <div class="flex flex-wrap gap-1.5">
              @for (s of strokes(); track $index; let i = $index) {
                <button type="button" (click)="removeAt(i)" [attr.aria-label]="'Remove stroke ' + (i + 1) + ', ' + name[s].en"
                  class="inline-flex items-center gap-1 rounded-lg pl-2.5 pr-1.5 py-1 text-[13px] font-bold border" [class]="chip(s, beat() === i)">
                  {{ name[s].en }} <span class="opacity-60 text-[15px] leading-none">×</span>
                </button>
              }
            </div>
          }
        </section>

        <!-- Stroke buttons -->
        <section class="grid grid-cols-3 gap-2.5 md:gap-3">
          @for (s of order; track s) {
            <button type="button" (click)="add(s)" [disabled]="strokes().length >= max"
              class="rounded-2xl border-2 px-2 py-4 md:py-5 flex flex-col items-center gap-1 active:scale-[0.98] disabled:opacity-40" [class]="bigButton(s)">
              <span class="n-disp text-[17px] md:text-[20px] font-semibold">{{ name[s].en }}</span>
              <span class="text-[12.5px] font-bold opacity-80">{{ name[s].pt }}</span>
              <span class="hidden md:block text-[12px] opacity-70">{{ name[s].hint }}</span>
            </button>
          }
        </section>

        <div class="flex flex-wrap gap-2">
          <button type="button" (click)="undo()" [disabled]="!strokes().length" class="rounded-full border border-[var(--n-line)] px-4 py-2 text-[13px] font-bold disabled:opacity-40">Remove last</button>
          <button type="button" (click)="clear()" [disabled]="!strokes().length" class="rounded-full border border-[var(--n-line)] px-4 py-2 text-[13px] font-bold disabled:opacity-40">Clear</button>
          @if (dirty()) {
            <button type="button" (click)="revert()" class="rounded-full px-4 py-2 text-[13px] font-bold text-[var(--n-tx2)]">Undo changes</button>
          }
        </div>
        @if (!strokes().length && initialLength() > 0) {
          <p class="m-0 text-[13px] text-[var(--n-warn)] font-semibold">Saving now removes this toque's pattern from the site.</p>
        }
        <p class="m-0 text-[12.5px] text-[var(--n-tx3)]">The site plays an approximation of the berimbau and says so. Where a toque has a video, that's the real reference.</p>
      </div>
    } @else if (data.toques().length) {
      <div class="px-6 py-16 text-center flex flex-col items-center gap-3">
        <h1 class="n-disp text-[20px] font-semibold">Toque not found</h1>
        <a routerLink="/admin/toques" class="rounded-full bg-[var(--n-acc)] text-[#101114] px-5 py-2 font-bold">Back to toques</a>
      </div>
    } @else {
      <div class="px-6 py-16 text-center text-[var(--n-tx2)]">Loading…</div>
    }
  `,
})
export class StudioToqueEditorComponent implements OnDestroy {
  readonly id = input.required<string>();

  readonly data = inject(DataService);
  private studio = inject(StudioService);

  readonly name = STROKE_NAME;
  readonly order: Stroke[] = ['tch', 'dom', 'dim'];
  readonly max = MAX_STROKES;

  readonly toque = computed(() => this.data.toqueById().get(this.id()) ?? null);
  readonly strokes = signal<Stroke[]>([]);
  private initial = signal<string>('[]');
  readonly initialLength = computed(() => (JSON.parse(this.initial()) as Stroke[]).length);
  readonly dirty = computed(() => JSON.stringify(this.strokes()) !== this.initial());
  readonly saving = signal(false);

  readonly savedLine = computed(() => {
    const m = this.studio.patternMeta(this.id());
    return m ? `Last saved ${shortDate(m.at)}${m.by ? ' by ' + m.by : ''}` : this.initialLength() ? 'Built-in pattern' : 'Nothing saved yet';
  });

  readonly playing = signal(false);
  readonly beat = signal<number | null>(null);
  private synth = new BerimbauSynth();
  private timer?: ReturnType<typeof setInterval>;
  private loadedFor = '';

  constructor() {
    // Load the saved pattern once per toque; later refreshes don't overwrite what's being tapped in.
    effect(() => {
      const id = this.id(), seq = this.data.patterns()[id] ?? [];
      untracked(() => {
        if (this.loadedFor === id && this.dirty()) return;
        this.loadedFor = id;
        this.strokes.set([...seq]);
        this.initial.set(JSON.stringify(seq));
      });
    });
  }

  add(s: Stroke): void {
    if (this.strokes().length >= MAX_STROKES) return;
    this.strokes.update(list => [...list, s]);
    // Hearing each stroke as it's tapped makes a wrong one obvious straight away.
    if (!this.playing()) void this.synth.wake().then(() => this.synth.strike(s));
  }
  removeAt(i: number): void { this.stop(); this.strokes.update(list => list.filter((_, k) => k !== i)); }
  undo(): void { this.stop(); this.strokes.update(list => list.slice(0, -1)); }
  clear(): void { this.stop(); this.strokes.set([]); }
  revert(): void { this.stop(); this.strokes.set(JSON.parse(this.initial()) as Stroke[]); }

  async togglePlay(): Promise<void> {
    if (this.playing()) { this.stop(); return; }
    if (!this.strokes().length) return;
    await this.synth.wake();
    this.playing.set(true);
    let i = 0;
    const tick = () => {
      const seq = this.strokes();
      if (!seq.length) { this.stop(); return; }
      i %= seq.length;
      this.beat.set(i); this.synth.strike(seq[i]); i++;
    };
    tick();
    this.timer = setInterval(tick, BEAT_MS);
  }

  stop(): void {
    clearInterval(this.timer);
    this.timer = undefined;
    this.playing.set(false);
    this.beat.set(null);
  }

  async save(): Promise<void> {
    if (this.saving() || !this.dirty()) return;
    this.saving.set(true);
    const seq = [...this.strokes()];
    try {
      await this.studio.savePattern(this.id(), seq);
      this.initial.set(JSON.stringify(seq));
      this.studio.flash(seq.length ? 'Pattern saved. It shows on the site now' : 'Pattern removed');
    } catch (e) {
      const code = (e as { code?: string } | null)?.code ?? '';
      this.studio.flash(code === 'permission-denied'
        ? 'Couldn\'t save: the database isn\'t allowing toque patterns yet, or your sign-in expired'
        : 'Couldn\'t save. Check the connection and try again');
    } finally {
      this.saving.set(false);
    }
  }

  chip(s: Stroke, on: boolean): string {
    if (on) return 'bg-[var(--n-acc)] border-[var(--n-acc)] text-[#101114]';
    return s === 'tch' ? 'bg-[var(--n-raise)] border-transparent text-[var(--n-tx2)]'
      : s === 'dom' ? 'bg-[var(--n-low-bg)] border-transparent text-[var(--n-low)]'
      : 'bg-[var(--n-acc-bg)] border-transparent text-[var(--n-acc-tx)]';
  }

  bigButton(s: Stroke): string {
    return s === 'tch' ? 'border-[var(--n-line)] bg-[var(--n-surf)] text-[var(--n-tx)]'
      : s === 'dom' ? 'border-[var(--n-low)] bg-[var(--n-low-bg)] text-[var(--n-low)]'
      : 'border-[var(--n-acc)] bg-[var(--n-acc-bg)] text-[var(--n-acc-tx)]';
  }

  canLeave(): boolean {
    return !this.dirty() || confirm('This pattern isn\'t saved. Leave without saving?');
  }

  onKey(e: KeyboardEvent): void {
    const target = e.target as HTMLElement | null;
    if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); void this.save(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const s = KEYS[e.key.toLowerCase()];
    if (s) { e.preventDefault(); this.add(s); return; }
    if (e.key === 'Backspace') { e.preventDefault(); this.undo(); }
    if (e.key === ' ' && this.strokes().length) { e.preventDefault(); void this.togglePlay(); }
  }

  onUnload(e: BeforeUnloadEvent): void {
    if (this.dirty()) { e.preventDefault(); e.returnValue = ''; }
  }

  ngOnDestroy(): void { this.stop(); this.synth.close(); }
}
