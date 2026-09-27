import { Component, computed, inject, input } from '@angular/core';
import { Toque } from '../../core/models/toque.model';
import { FirebaseService } from '../../core/services/firebase.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { TEMPO_LABEL } from './novo-utils';

/** A toque's speed and BPM range, colour-coded: blue slow, amber medium, red fast. */
@Component({
  selector: 'app-novo-tempo',
  standalone: true,
  template: `
    @if (toque(); as t) {
      <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold whitespace-nowrap" [class]="tone()">
        {{ label() }}
        @if (t.tempoBPM) {
          <span class="font-['Geist_Mono',monospace] font-normal">{{ t.tempoBPM.min }}–{{ t.tempoBPM.max }}</span>
        }
      </span>
    }
  `,
})
export class NovoTempoComponent {
  toque = input<Toque | undefined>();
  readonly label = computed(() => TEMPO_LABEL[this.toque()?.tempo ?? 'variable']);
  readonly tone = computed(() => ({
    slow: 'bg-[#e8effd] text-[#1d4ed8]',
    medium: 'bg-[#fdf3e2] text-[#8a5200]',
    fast: 'bg-[#fde9ec] text-[#b4232c]',
    variable: 'bg-[#eef0f3] text-[#434a5a]',
  })[this.toque()?.tempo ?? 'variable']);
}

/** Where a song stands for this student: learned, being practised (starred), or neither. */
@Component({
  selector: 'app-novo-status',
  standalone: true,
  template: `
    @if (learned()) {
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#e6f5ee] text-[#0b7a55] text-xs font-semibold whitespace-nowrap">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>
        Aprendida
      </span>
    } @else if (practising()) {
      <span class="inline-flex px-2 py-0.5 rounded-md bg-[#eef1fd] text-[#2146d8] text-xs font-semibold whitespace-nowrap">Praticando</span>
    } @else {
      <span class="text-xs text-[#5f6778]"><span aria-hidden="true">—</span><span class="sr-only">Sem status</span></span>
    }
  `,
})
export class NovoStatusComponent {
  songId = input.required<string>();
  private firebase = inject(FirebaseService);
  readonly learned = computed(() => this.firebase.learnedSongs().has(this.songId()));
  readonly practising = computed(() => this.firebase.favorites().has(this.songId()));
}

/** The star. It goes through the site's own favourites action, so signing in, saving and
 *  the confirmation all behave exactly as on the current design. */
@Component({
  selector: 'app-novo-heart',
  standalone: true,
  template: `
    <button type="button" (click)="favorites.toggle(songId()); $event.stopPropagation()"
      [attr.aria-pressed]="on()" [attr.aria-label]="(on() ? 'Tirar da fila: ' : 'Pôr na fila: ') + title()"
      class="w-11 h-11 md:w-9 md:h-9 flex items-center justify-center rounded-lg hover:bg-[#f6f7f9] transition-colors"
      [class]="on() ? 'text-[#c6283a]' : 'text-[#9aa1af]'">
      <svg width="17" height="17" viewBox="0 0 24 24" [attr.fill]="on() ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>
      </svg>
    </button>
  `,
})
export class NovoHeartComponent {
  songId = input.required<string>();
  title = input<string>('');
  readonly favorites = inject(FavoritesService);
  private firebase = inject(FirebaseService);
  readonly on = computed(() => this.firebase.favorites().has(this.songId()));
}

/** Stroke icons for the new design, by name. */
@Component({
  selector: 'app-novo-icon',
  standalone: true,
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      @switch (name()) {
        @case ('home') { <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/> }
        @case ('list') { <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/> }
        @case ('drum') { <ellipse cx="12" cy="7" rx="8" ry="3"/><path d="M4 7v9c0 1.7 3.6 3 8 3s8-1.3 8-3V7"/> }
        @case ('heart') { <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/> }
        @case ('check') { <path d="M5 13l4 4L19 7"/> }
        @case ('search') { <circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/> }
        @case ('eye') { <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/> }
        @case ('video') { <rect x="3" y="5" width="14" height="14" rx="2"/><path d="M17 10l4-2v8l-4-2"/> }
        @case ('share') { <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13"/> }
        @case ('print') { <path d="M6 9V3h12v6M6 18H4v-6h16v6h-2M8 14h8v7H8z"/> }
        @case ('back') { <path d="M15 18l-6-6 6-6"/> }
        @case ('next') { <path d="M9 6l6 6-6 6"/> }
        @case ('play') { <path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/> }
        @case ('stop') { <rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor" stroke="none"/> }
        @case ('minus') { <path d="M5 12h14"/> }
        @case ('plus') { <path d="M12 5v14M5 12h14"/> }
      }
    </svg>
  `,
})
export class NovoIconComponent {
  name = input.required<string>();
  size = input<number>(18);
}
