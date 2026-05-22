import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-filter-chip',
  standalone: true,
  template: `
    <button
      (click)="toggle.emit()"
      [class]="active()
        ? 'px-3 py-1.5 rounded-full text-xs font-medium bg-capoeira-gold text-white'
        : 'px-3 py-1.5 rounded-full text-xs font-medium bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'">
      {{ label() }}
    </button>
  `,
})
export class FilterChipComponent {
  label = input.required<string>();
  active = input<boolean>(false);
  toggle = output<void>();
}
