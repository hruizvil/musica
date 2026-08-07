import { Component, input, output } from '@angular/core';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
}

/**
 * One exclusive choice between a few options — the lyric language, today. Use a
 * filter chip instead when the choice narrows a list rather than switching a view.
 */
@Component({
  selector: 'app-segmented-control',
  standalone: true,
  template: `
    <div role="group" [attr.aria-label]="ariaLabel()"
      class="no-print inline-flex p-1 gap-1 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
      @for (option of options(); track option.value) {
        <button type="button"
          [attr.aria-pressed]="value() === option.value"
          (click)="selected.emit(option.value)"
          class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
          [class]="value() === option.value
            ? 'bg-white dark:bg-stone-900 text-capoeira-brown dark:text-capoeira-gold shadow-sm'
            : 'text-stone-500 dark:text-stone-400 hover:text-capoeira-brown dark:hover:text-capoeira-gold'">
          {{ option.label }}
        </button>
      }
    </div>
  `,
})
export class SegmentedControlComponent {
  options = input.required<readonly SegmentOption[]>();
  value = input.required<string>();
  ariaLabel = input<string>('Opções');

  selected = output<string>();
}
