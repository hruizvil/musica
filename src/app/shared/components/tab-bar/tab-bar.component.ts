import { Component, input, output } from '@angular/core';

export interface TabOption<T extends string = string> {
  value: T;
  label: string;
}

/**
 * Switches between panels of one page — the song's Coro / Letra / Sobre, the
 * toque's Sobre / Vídeos. Distinct from the filter chip, which narrows a list
 * rather than swapping what is on screen.
 *
 * Callers are expected to offer only tabs they can fill.
 */
@Component({
  selector: 'app-tab-bar',
  standalone: true,
  template: `
    <div role="tablist" [attr.aria-label]="ariaLabel()" class="no-print flex flex-wrap gap-1.5">
      @for (tab of tabs(); track tab.value) {
        <button type="button" role="tab"
          [id]="idPrefix() + '-tab-' + tab.value"
          [attr.aria-selected]="active() === tab.value"
          [attr.aria-controls]="idPrefix() + '-panel-' + tab.value"
          [tabindex]="active() === tab.value ? 0 : -1"
          (click)="select.emit(tab.value)"
          (keydown)="onKeydown($event)"
          class="px-3.5 py-2 rounded-xl text-sm font-semibold border transition-colors"
          [class]="active() === tab.value
            ? 'bg-capoeira-gold/10 border-capoeira-gold text-capoeira-brown dark:text-capoeira-gold'
            : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:border-capoeira-gold/50'">
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

  select = output<string>();

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
