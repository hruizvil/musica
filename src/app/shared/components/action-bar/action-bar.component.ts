import {
  Component, DestroyRef, ElementRef, afterEveryRender, afterNextRender, computed, inject, input,
  output, signal,
} from '@angular/core';

/** The icons this bar knows how to draw. Kept here rather than passed in as markup so
 *  an overflowed action can be redrawn inside the menu from the same source. */
export type ActionIcon =
  | 'loop' | 'clock' | 'heart' | 'heart-filled' | 'check' | 'print' | 'share'
  | 'prev' | 'next' | 'shuffle';

const ICON_PATHS: Record<ActionIcon, string> = {
  loop: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  clock: 'M12 7v5l3 2',
  heart: 'M12 20.3l-1.4-1.3C6 14.9 3 12.2 3 8.8 3 6.1 5.1 4 7.8 4c1.5 0 3 .7 4.2 2.1C13.2 4.7 14.7 4 16.2 4 18.9 4 21 6.1 21 8.8c0 3.4-3 6.1-7.6 10.2L12 20.3z',
  'heart-filled': 'M12 20.3l-1.4-1.3C6 14.9 3 12.2 3 8.8 3 6.1 5.1 4 7.8 4c1.5 0 3 .7 4.2 2.1C13.2 4.7 14.7 4 16.2 4 18.9 4 21 6.1 21 8.8c0 3.4-3 6.1-7.6 10.2L12 20.3z',
  check: 'M5 13l4 4L19 7',
  print: 'M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z',
  share: 'M8.7 10.7a3 3 0 100 2.6m0-2.6l6.6-3.4m-6.6 6l6.6 3.4M18 7a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm0 10a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z',
  prev: 'M15 19l-7-7 7-7',
  next: 'M9 5l7 7-7 7',
  shuffle: 'M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
};

/**
 * How many actions fit on one line. Pure so it can be tested without a browser: the
 * measuring is the part a test cannot do, the arithmetic is the part worth checking.
 *
 * `widths` is in the same order as the actions. `pinned` never collapses, so the answer
 * is never lower than that even where the row would run tight.
 */
export function fitCount(
  widths: readonly number[],
  options: { available: number; gap: number; moreWidth: number; pinned?: number },
): number {
  const { available, gap, moreWidth, pinned = 0 } = options;
  if (!widths.length) return 0;
  if (available <= 0) return widths.length;

  const total = widths.reduce((sum, w) => sum + w, 0) + gap * (widths.length - 1);
  if (total <= available) return widths.length;

  // Everything cannot fit, so the ⋯ button will be there and needs its own room.
  const budget = available - moreWidth - gap;
  let used = 0;
  let count = 0;
  for (const width of widths) {
    const next = used + width + (count ? gap : 0);
    if (next > budget) break;
    used = next;
    count++;
  }
  return Math.max(count, Math.min(pinned, widths.length));
}

export interface ActionItem {
  id: string;
  /** The accessible name, and the wording used when this action sits in the menu. */
  label: string;
  icon: ActionIcon;
  /** Short text beside the icon while inline, e.g. the current speed. */
  badge?: string;
  /** Draws the button as switched on. */
  active?: boolean;
  /** Current value, shown in the menu — a collapsed icon must not hide its state. */
  state?: string;
  /** Never collapses into the menu. For transport, where hiding Next is absurd. */
  pinned?: boolean;
  disabled?: boolean;
  /** Borrows a colour where the meaning is conventional rather than neutral. */
  tone?: 'favorite' | 'learned';
}

/**
 * One row of icon actions that keeps whatever fits and folds the rest into a ⋯ menu.
 *
 * The decision comes from the measured width of the row, not from a breakpoint: the
 * desktop sidebar changes width without the window changing at all, and a media query
 * cannot see that.
 *
 * Widths come from a hidden mirror row holding every action at once. Measuring the real
 * row would only ever see what had not collapsed, and the set of actions changes under
 * us — favourites appear once Firebase loads, and the speed badge changes width when it
 * reads 0.75× instead of 1×.
 *
 * Order is priority order: the earliest survives longest. List pinned items first.
 */
@Component({
  selector: 'app-action-bar',
  standalone: true,
  template: `
    <div class="relative flex justify-end">

      <!-- Measured, never seen. Zero-sized wrapper so it cannot widen the page. -->
      <div aria-hidden="true" class="absolute w-0 h-0 overflow-hidden pointer-events-none">
        <div #mirror data-mirror class="flex flex-nowrap items-center gap-2">
          @for (action of actions(); track action.id) {
            <span [class]="buttonClass(action)">
              <svg class="w-[17px] h-[17px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path [attr.d]="path(action.icon)" stroke-width="2" />
              </svg>
              @if (action.badge) {
                <span class="text-xs font-bold">{{ action.badge }}</span>
              }
            </span>
          }
          <span [class]="base + ' ' + idleClass"><span class="text-base leading-none">⋯</span></span>
        </div>
      </div>

      <div #row data-bar
        class="flex flex-nowrap items-center justify-end gap-2 overflow-hidden w-full"
        [attr.aria-label]="ariaLabel()" role="group">

        @for (action of inline(); track action.id) {
          <button type="button"
            (click)="triggered.emit(action.id)"
            [disabled]="!!action.disabled"
            [attr.aria-label]="action.label"
            [attr.title]="action.label + (action.state ? ' — ' + action.state : '')"
            [attr.aria-pressed]="action.active === undefined ? null : action.active"
            [class]="buttonClass(action)">
            <svg class="w-[17px] h-[17px] shrink-0" viewBox="0 0 24 24"
              [attr.fill]="action.icon === 'heart-filled' ? 'currentColor' : 'none'"
              stroke="currentColor">
              @if (action.icon === 'clock') {
                <circle cx="12" cy="12" r="9" stroke-width="2" />
              }
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                [attr.d]="path(action.icon)" />
            </svg>
            @if (action.badge) {
              <span class="text-xs font-bold">{{ action.badge }}</span>
            }
          </button>
        }

        @if (overflow().length) {
          <button type="button" (click)="menuOpen.set(!menuOpen())"
            aria-haspopup="true" [attr.aria-expanded]="menuOpen()"
            aria-label="Mais ações" title="Mais ações"
            [class]="base + ' ' + (menuOpen() ? onClass : idleClass)">
            <span class="text-base leading-none">⋯</span>
          </button>
        }
      </div>

      @if (menuOpen() && overflow().length) {
        <button type="button" (click)="menuOpen.set(false)" aria-label="Fechar mais ações"
          class="fixed inset-0 z-40 cursor-default"></button>

        <div role="menu"
          class="absolute right-0 top-12 z-50 min-w-[13rem] rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-xl py-1.5">
          @for (action of overflow(); track action.id) {
            <button type="button" role="menuitem"
              (click)="triggered.emit(action.id); menuOpen.set(false)"
              [disabled]="!!action.disabled"
              class="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-40 transition-colors">
              <svg class="w-[17px] h-[17px] shrink-0" viewBox="0 0 24 24"
                [attr.fill]="action.icon === 'heart-filled' ? 'currentColor' : 'none'"
                stroke="currentColor"
                [class]="action.active ? 'text-capoeira-gold' : ''">
                @if (action.icon === 'clock') {
                  <circle cx="12" cy="12" r="9" stroke-width="2" />
                }
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  [attr.d]="path(action.icon)" />
              </svg>
              <span class="text-left">{{ action.label }}</span>
              @if (action.state) {
                <span class="ml-auto pl-3 text-xs font-semibold text-stone-400 shrink-0">{{ action.state }}</span>
              }
            </button>
          }
        </div>
      }

      <!-- Panels the host anchors to this row, e.g. the speed popover. -->
      <ng-content />
    </div>
  `,
})
export class ActionBarComponent {
  actions = input.required<readonly ActionItem[]>();
  ariaLabel = input<string>('Ações');
  triggered = output<string>();

  readonly menuOpen = signal(false);

  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Natural widths by action id, read from the mirror. */
  private readonly widths = signal<Map<string, number>>(new Map());
  private readonly moreWidth = signal(40);
  private readonly available = signal(0);
  private readonly gap = 8;

  readonly base = 'h-10 min-w-[2.5rem] shrink-0 px-2.5 flex items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold transition-colors shadow-sm disabled:opacity-30';
  readonly idleClass = 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-400 hover:text-capoeira-brown dark:hover:text-capoeira-gold hover:border-capoeira-gold';
  readonly onClass = 'border-capoeira-gold/50 bg-capoeira-gold/10 text-capoeira-brown dark:text-capoeira-gold';
  private readonly favClass = 'border-red-200 bg-red-50 text-red-500 dark:bg-red-900/20 dark:border-red-800';
  private readonly learnedClass = 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800';

  private readonly visibleCount = computed(() => {
    const actions = this.actions();
    const widths = this.widths();
    // Before the first measurement, show everything: too many is recoverable on the
    // next frame, whereas collapsing on a guess hides an action that had room.
    if (!widths.size) return actions.length;

    return fitCount(actions.map(a => widths.get(a.id) ?? 40), {
      available: this.available(),
      gap: this.gap,
      moreWidth: this.moreWidth(),
      pinned: actions.filter(a => a.pinned).length,
    });
  });

  readonly inline = computed(() => this.actions().slice(0, this.visibleCount()));
  readonly overflow = computed(() => this.actions().slice(this.visibleCount()));

  constructor() {
    // Three things can change the answer, and they need three different triggers.
    //
    //  - the row's width changing on its own (a sidebar column reflowing): ResizeObserver
    //  - the window resizing: its own event, since that is cheap and always delivered
    //  - the actions changing, or anything else re-rendering: afterRender
    //
    // afterRender alone would miss a pure CSS reflow, and ResizeObserver alone is not
    // delivered in environments that never paint. Together they cover it, and the
    // change guard in remeasure() keeps a write from causing an endless render loop.
    afterEveryRender(() => this.remeasure());

    afterNextRender(() => {
      const row = this.hostRef.nativeElement.querySelector('[data-bar]');
      const mirror = this.hostRef.nativeElement.querySelector('[data-mirror]');
      if (!(row instanceof HTMLElement) || !(mirror instanceof HTMLElement)) return;

      const observer = new ResizeObserver(() => this.remeasure());
      observer.observe(row);
      observer.observe(mirror);
      const onResize = () => this.remeasure();
      window.addEventListener('resize', onResize);
      this.destroyRef.onDestroy(() => {
        observer.disconnect();
        window.removeEventListener('resize', onResize);
      });
    });
  }

  private remeasure(): void {
    const root = this.hostRef.nativeElement;
    const row = root.querySelector('[data-bar]');
    const mirror = root.querySelector('[data-mirror]');
    if (!(row instanceof HTMLElement) || !(mirror instanceof HTMLElement)) return;
    this.readMirror(mirror);
    const width = row.clientWidth;
    if (width && Math.abs(width - this.available()) >= 0.5) this.available.set(width);
  }

  private readMirror(mirror: HTMLElement): void {
    const cells = [...mirror.children].filter((c): c is HTMLElement => c instanceof HTMLElement);
    const actions = this.actions();
    const next = new Map<string, number>();
    actions.forEach((action, i) => {
      const width = cells[i]?.getBoundingClientRect().width;
      if (width) next.set(action.id, width);
    });
    const more = cells[actions.length]?.getBoundingClientRect().width;

    // Only write when something actually moved, so the observer cannot chase itself.
    const same = next.size === this.widths().size
      && [...next].every(([id, w]) => Math.abs((this.widths().get(id) ?? -1) - w) < 0.5);
    if (!same) this.widths.set(next);
    if (more && Math.abs(more - this.moreWidth()) >= 0.5) this.moreWidth.set(more);
  }

  path(icon: ActionIcon): string {
    return ICON_PATHS[icon];
  }

  buttonClass(action: ActionItem): string {
    if (action.tone === 'favorite' && action.active) return this.base + ' ' + this.favClass;
    if (action.tone === 'learned' && action.active) return this.base + ' ' + this.learnedClass;
    return this.base + ' ' + (action.active ? this.onClass : this.idleClass);
  }
}
