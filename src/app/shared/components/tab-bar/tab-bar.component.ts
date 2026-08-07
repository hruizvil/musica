import { Component, computed, input, output } from '@angular/core';

export interface TabOption<T extends string = string> {
  value: T;
  label: string;
}

/** `pill` is the bordered row used inside a song. `strip` is the inset segmented
 *  strip used above a filtered list. Same control, same keyboard behaviour. */
export type TabBarVariant = 'pill' | 'strip';

const CONTAINER: Record<TabBarVariant, string> = {
  pill: 'no-print flex flex-wrap gap-1.5',
  strip: 'no-print flex gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800 overflow-x-auto scrollbar-hide',
};

const BUTTON: Record<TabBarVariant, string> = {
  pill: 'px-3.5 py-2 rounded-xl text-sm font-semibold border transition-colors',
  strip: 'px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-150 rounded-lg shrink-0',
};

const ACTIVE: Record<TabBarVariant, string> = {
  pill: 'bg-capoeira-gold/10 border-capoeira-gold text-capoeira-brown dark:text-capoeira-gold',
  strip: 'bg-white dark:bg-stone-700 text-capoeira-brown dark:text-capoeira-gold shadow-sm',
};

const IDLE: Record<TabBarVariant, string> = {
  pill: 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:border-capoeira-gold/50',
  strip: 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200',
};

/**
 * Switches between panels of one page — the song's Coro / Letra / Sobre — or between
 * views of one list, like the toque categories. Distinct from the filter chip, which
 * narrows a list without the tabs' one-of-many semantics.
 *
 * Callers are expected to offer only tabs they can fill.
 */
@Component({
  selector: 'app-tab-bar',
  standalone: true,
  template: `
    <div role="tablist" [attr.aria-label]="ariaLabel()" [class]="containerClass()">
      @for (tab of tabs(); track tab.value) {
        <button type="button" role="tab"
          [id]="idPrefix() + '-tab-' + tab.value"
          [attr.aria-selected]="active() === tab.value"
          [attr.aria-controls]="panelId() ?? idPrefix() + '-panel-' + tab.value"
          [tabindex]="active() === tab.value ? 0 : -1"
          (click)="select.emit(tab.value)"
          (keydown)="onKeydown($event)"
          [class]="buttonClass() + ' ' + (active() === tab.value ? activeClass() : idleClass())">
          {{ tab.label }}
        </button>
      }
    </div>
  `,
})
export class TabBarComponent {
  tabs = input.required<readonly TabOption[]>();
  active = input.required<string>();
  ariaLabel = input<string>('Seções');
  /** Namespaces the tab and panel ids so two tab bars can share a page. */
  idPrefix = input<string>('tabs');
  variant = input<TabBarVariant>('pill');
  /**
   * Set when every tab drives the same region — a filtered list has one result area,
   * not a panel per tab. Left unset, each tab points at its own `-panel-<value>`.
   */
  panelId = input<string | null>(null);

  select = output<string>();

  protected readonly containerClass = computed(() => CONTAINER[this.variant()]);
  protected readonly buttonClass = computed(() => BUTTON[this.variant()]);
  protected readonly activeClass = computed(() => ACTIVE[this.variant()]);
  protected readonly idleClass = computed(() => IDLE[this.variant()]);

  /** Left/right arrows move between tabs, as a tablist is expected to. */
  onKeydown(event: KeyboardEvent): void {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const values = this.tabs().map(t => t.value);
    const next = values[(values.indexOf(this.active()) + step + values.length) % values.length];
    this.select.emit(next);
    // Move focus with the selection so the keyboard user lands on the new tab.
    const el = document.getElementById(`${this.idPrefix()}-tab-${next}`);
    el?.focus();
  }
}
