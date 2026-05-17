import { Component, input, signal } from '@angular/core';

@Component({
  selector: 'app-lyrics-display',
  standalone: true,
  template: `
    <div class="space-y-4">
      <pre class="font-display text-base leading-relaxed whitespace-pre-line text-stone-800 dark:text-stone-200">{{ lyrics() }}</pre>

      @if (translation()) {
        <div>
          <button
            (click)="showTranslation.set(!showTranslation())"
            class="text-sm text-capoeira-gold hover:underline flex items-center gap-1">
            {{ showTranslation() ? 'Ocultar tradução' : 'Ver tradução (inglês)' }}
          </button>
          @if (showTranslation()) {
            <pre class="mt-2 font-display text-sm leading-relaxed whitespace-pre-line text-stone-500 dark:text-stone-400 border-l-2 border-capoeira-gold pl-4">{{ translation() }}</pre>
          }
        </div>
      }
    </div>
  `,
})
export class LyricsDisplayComponent {
  lyrics = input.required<string>();
  translation = input<string | null>(null);

  readonly showTranslation = signal(false);
}
