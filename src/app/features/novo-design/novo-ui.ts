import { Component, computed, inject, input } from '@angular/core';
import { FirebaseService } from '../../core/services/firebase.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { Stroke } from './novo-data';
import { DataService } from '../../core/services/data.service';
import { NovoLangService } from './novo-lang.service';

/** Stroke icons for the new design, by name. */
@Component({
  selector: 'app-novo-icon',
  standalone: true,
  host: { class: 'inline-flex shrink-0' },
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" [attr.fill]="filled() ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      @switch (name()) {
        @case ('home') { <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/> }
        @case ('drum') { <ellipse cx="12" cy="7" rx="8" ry="3"/><path d="M4 7v9c0 1.7 3.6 3 8 3s8-1.3 8-3V7"/> }
        @case ('note') { <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/> }
        @case ('heart') { <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/> }
        @case ('check') { <path d="M5 13l4 4L19 7"/> }
        @case ('search') { <circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/> }
        @case ('play') { <path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none"/> }
        @case ('pause') { <path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor" stroke="none"/> }
        @case ('prev') { <path d="M19 20L9 12l10-8z" fill="currentColor"/><path d="M5 19V5"/> }
        @case ('next') { <path d="M5 4l10 8-10 8z" fill="currentColor"/><path d="M19 5v14"/> }
        @case ('loop') { <path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/> }
        @case ('shuffle') { <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/> }
        @case ('lyrics') { <path d="M4 6h16M4 12h10M4 18h7"/><circle cx="18" cy="17" r="3"/> }
        @case ('video') { <rect x="3" y="5" width="14" height="14" rx="2"/><path d="M17 10l4-2v8l-4-2"/> }
        @case ('share') { <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13"/> }
        @case ('back') { <path d="M15 18l-6-6 6-6"/> }
        @case ('up') { <path d="M18 15l-6-6-6 6"/> }
        @case ('down') { <path d="M6 9l6 6 6-6"/> }
        @case ('min') { <path d="M5 12h14"/> }
        @case ('close') { <path d="M6 6l12 12M18 6L6 18"/> }
        @case ('sun') { <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/> }
        @case ('user') { <circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/> }
        @case ('more') { <circle cx="5" cy="12" r="1.8" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.8" fill="currentColor" stroke="none"/> }
        @case ('plus') { <path d="M12 5v14M5 12h14"/> }
        @case ('list') { <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/> }
        @case ('trash') { <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/> }
        @case ('external') { <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/> }
        @case ('logout') { <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l-5-5 5-5M5 12h11"/> }
        @case ('menu') { <path d="M4 6h16M4 12h16M4 18h16"/> }
        @case ('moon') { <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/> }
      }
    </svg>
  `,
})
export class NovoIconComponent {
  name = input.required<string>();
  size = input<number>(20);
  filled = input<boolean>(false);
}

/**
 * Generated cover art: a colour field, two circles placed by a seed, and the name set in
 * type. Songs have no artwork of their own, so this is what makes lists read as music.
 */
@Component({
  selector: 'app-novo-cover',
  standalone: true,
  imports: [NovoIconComponent],
  host: { class: 'block shrink-0' },
  template: `
    <span class="relative block overflow-hidden" role="img" [attr.aria-label]="L.s().coverOf(title() || label())"
          [style.width.px]="size()" [style.height.px]="size()" [style.border-radius.px]="radius()" [style.background]="color()">
      <span class="absolute rounded-full box-border" [style]="ringStyle()"></span>
      <span class="absolute rounded-full bg-black/20" [style]="dotStyle()"></span>
      @if (icon()) {
        <span class="absolute inset-0 flex items-center justify-center text-white"><app-novo-icon [name]="icon()!" [size]="size() * 0.42" [filled]="icon() === 'heart'" /></span>
      } @else if (size() >= 110 && title()) {
        <span class="absolute inset-0 flex flex-col justify-between text-white box-border" [style.padding.px]="size() * 0.09">
          <span class="font-bold uppercase tracking-[0.12em] opacity-85" [style.font-size.px]="labelSize()">{{ label() }}</span>
          <span class="font-extrabold leading-[1.05] tracking-[-0.02em]" [style.font-size.px]="titleSize()">{{ title() }}</span>
        </span>
      }
    </span>
  `,
})
export class NovoCoverComponent {
  color = input.required<string>();
  title = input<string>('');
  label = input<string>('');
  size = input<number>(48);
  radius = input<number>(10);
  seed = input<number>(0);
  icon = input<string | null>(null);
  readonly L = inject(NovoLangService);

  readonly labelSize = computed(() => Math.max(9, this.size() * 0.065));
  readonly titleSize = computed(() => this.size() * (this.title().length < 18 ? 0.12 : 0.095));

  readonly ringStyle = computed(() => {
    const s = this.size(); const v = this.seed() % 4;
    const pos = [['right', 'bottom', -0.32, -0.36], ['left', 'bottom', -0.38, -0.3], ['right', 'top', -0.4, -0.28], ['left', 'top', -0.3, -0.42]][v];
    return `${pos[0]}: ${s * (pos[2] as number)}px; ${pos[1]}: ${s * (pos[3] as number)}px; width: ${s * 0.95}px; height: ${s * 0.95}px; border: ${Math.max(2, s * 0.085)}px solid rgba(255,255,255,0.16)`;
  });
  readonly dotStyle = computed(() => {
    const s = this.size(); const v = this.seed() % 4;
    const pos = [['left', 'top'], ['right', 'top'], ['left', 'bottom'], ['right', 'bottom']][v];
    return `${pos[0]}: ${s * 0.1}px; ${pos[1]}: ${s * 0.1}px; width: ${s * 0.34}px; height: ${s * 0.34}px`;
  });
}

/**
 * A berimbau pattern on three lines: dim (high) on top, chiado in the middle, dom (low)
 * below, with the word under each beat. Toques without a confirmed pattern say so.
 */
@Component({
  selector: 'app-novo-pattern',
  standalone: true,
  host: { class: 'inline-flex' },
  template: `
    @if (strokes(); as seq) {
      <span class="relative inline-flex" role="img" [attr.aria-label]="L.s().patternAria(spoken())" [style.gap.px]="dims().gap" [style.padding]="'0 ' + dims().gap + 'px'">
        <span class="absolute inset-x-0 top-0" [style.height.px]="dims().lane * 3" aria-hidden="true">
          @for (k of [0, 1, 2]; track k) {
            <span class="absolute inset-x-0 h-px" [style.top.px]="dims().lane * k + dims().lane / 2" [style.background]="onColor() ? 'rgba(255,255,255,0.3)' : 'var(--n-line)'"></span>
          }
        </span>
        @for (s of seq; track $index; let i = $index) {
          <span class="flex flex-col items-center" [style.gap.px]="6" [style.width.px]="dims().beat" aria-hidden="true">
            <span class="relative" [style.width.px]="dims().beat" [style.height.px]="dims().lane * 3">
              @if (s === 'tch') {
                <span class="absolute inset-x-0 rounded-[3px]" [style.top.px]="dims().lane * 1.5 - dims().beat * 0.18" [style.height.px]="dims().beat * 0.36"
                      [style.background]="'repeating-linear-gradient(115deg,' + colorAt(i) + ' 0,' + colorAt(i) + ' 2px,transparent 2px,transparent 5px)'"></span>
              } @else {
                <span class="absolute rounded-full" [style.width.px]="dims().beat * 0.78" [style.height.px]="dims().beat * 0.78" [style.left.px]="dims().beat * 0.11"
                      [style.top.px]="(s === 'dim' ? 0 : dims().lane * 2) + (dims().lane - dims().beat * 0.78) / 2" [style.background]="colorAt(i)"></span>
              }
            </span>
            @if (size() !== 's') {
              <span class="font-bold" [style.font-size.px]="size() === 'l' ? 15 : 12" [style.color]="active() === i ? '#ffc21a' : (onColor() ? 'rgba(255,255,255,0.85)' : 'var(--n-tx3)')">{{ s }}</span>
            }
          </span>
        }
      </span>
    } @else {
      <span class="inline-flex items-center font-semibold" [style.min-height.px]="dims().lane * 3" [style.font-size.px]="size() === 'l' ? 15 : 12"
            [style.color]="onColor() ? 'rgba(255,255,255,0.85)' : 'var(--n-tx3)'">{{ L.s().patternNone }}</span>
    }
  `,
})
export class NovoPatternComponent {
  toqueId = input.required<string>();
  size = input<'s' | 'm' | 'l'>('m');
  onColor = input<boolean>(false);
  active = input<number | null>(null);

  /** Draws this pattern instead of the toque's saved one (the admin's live preview). */
  pattern = input<Stroke[] | null>(null);

  private data = inject(DataService);
  readonly strokes = computed<Stroke[] | null>(() => {
    const given = this.pattern();
    if (given) return given.length ? given : null;
    return this.data.patterns()[this.toqueId()] ?? null;
  });
  readonly L = inject(NovoLangService);
  readonly spoken = computed(() => {
    const d = this.L.s();
    const word: Record<Stroke, string> = { tch: d.strokeTch, dom: d.strokeDom, dim: d.strokeDim };
    return (this.strokes() ?? []).map(s => s + ' (' + word[s] + ')').join(', ');
  });
  readonly dims = computed(() => {
    const beat = { s: 16, m: 26, l: 44 }[this.size()];
    return { beat, gap: { s: 6, m: 10, l: 16 }[this.size()], lane: beat + 4 };
  });

  colorAt(i: number): string {
    if (this.active() === i) return '#ffc21a';
    return this.onColor() ? '#ffffff' : 'var(--n-tx)';
  }
}

/** The heart. It goes through the site's own favourites action, so sign-in and saving behave as on the current design. */
@Component({
  selector: 'app-novo-heart',
  standalone: true,
  imports: [NovoIconComponent],
  template: `
    <button type="button" (click)="favorites.toggle(songId()); $event.stopPropagation()"
      [attr.aria-pressed]="on()" [attr.aria-label]="on() ? L.s().unlikeSong(title()) : L.s().likeNamed(title())"
      class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-[var(--n-raise)] transition-colors"
      [style.color]="on() ? 'var(--n-acc-tx)' : 'var(--n-tx3)'">
      <app-novo-icon name="heart" [size]="size()" [filled]="on()" />
    </button>
  `,
})
export class NovoHeartComponent {
  songId = input.required<string>();
  title = input<string>('');
  size = input<number>(18);
  readonly favorites = inject(FavoritesService);
  readonly L = inject(NovoLangService);
  private firebase = inject(FirebaseService);
  readonly on = computed(() => this.firebase.favorites().has(this.songId()));
}
