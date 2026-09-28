import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { FirebaseService } from '../../core/services/firebase.service';
import { Song } from '../../core/models/song.model';
import { Toque } from '../../core/models/toque.model';
import { NovoPlayerService } from './novo-player.service';
import { NovoCoverComponent, NovoHeartComponent, NovoIconComponent, NovoPatternComponent } from './novo-ui';
import { CATEGORY_LABEL, firstLine, seedOf, songColor, toqueColor } from './novo-data';

/**
 * One song in a list: number (or the playing mark), cover, title with its first line,
 * then the toque or the student's status, and the heart. Tapping the number plays the
 * list from this song; tapping the title opens it.
 */
@Component({
  selector: 'app-novo-song-row',
  standalone: true,
  imports: [RouterLink, NovoCoverComponent, NovoHeartComponent, NovoIconComponent],
  template: `
    <div class="group grid grid-cols-[40px_44px_minmax(0,1fr)_auto] md:grid-cols-[40px_48px_minmax(0,1fr)_150px_44px] items-center gap-3 md:gap-3.5 py-2 pl-1 pr-1 md:px-3 rounded-xl"
         [style.background]="playing() ? 'var(--n-raise)' : ''">
      <button type="button" (click)="play()" [attr.aria-label]="'Tocar ' + song().title"
        class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold tabular-nums hover:bg-[var(--n-raise)]"
        [style.color]="playing() ? 'var(--n-acc-tx)' : 'var(--n-tx3)'">
        @if (playing()) {
          <span class="flex items-end gap-[2px] h-3.5" aria-hidden="true"><span class="w-[3px] h-[55%] rounded-sm bg-[var(--n-acc)]"></span><span class="w-[3px] h-full rounded-sm bg-[var(--n-acc)]"></span><span class="w-[3px] h-[35%] rounded-sm bg-[var(--n-acc)]"></span></span>
        } @else {
          <span class="group-hover:hidden">{{ n() }}</span><span class="hidden group-hover:inline-flex"><app-novo-icon name="play" [size]="16" /></span>
        }
      </button>
      <app-novo-cover [color]="color()" [size]="coverSize()" [radius]="10" [seed]="seed()" class="hidden min-[360px]:block" />
      <a [routerLink]="['/novo/cantigas', song().id]" class="min-w-0 flex flex-col gap-0.5 hover:no-underline">
        <span class="text-[15px] md:text-base font-extrabold truncate" [style.color]="playing() ? 'var(--n-acc-tx)' : 'var(--n-tx)'">{{ song().title }}</span>
        <span class="text-sm text-[var(--n-tx2)] truncate">“{{ first() }}”</span>
      </a>
      <span class="hidden md:block text-[13px] truncate" [style.color]="statusColor()">{{ side() }}</span>
      <app-novo-heart [songId]="song().id" [title]="song().title" />
    </div>
  `,
})
export class NovoSongRowComponent {
  song = input.required<Song>();
  n = input<number>(1);
  /** The list this row belongs to, played from this song when its number is tapped. */
  queue = input<string[]>([]);
  showStatus = input<boolean>(false);

  private data = inject(DataService);
  private firebase = inject(FirebaseService);
  private player = inject(NovoPlayerService);

  readonly playing = computed(() => this.player.isCurrentSong(this.song().id));
  readonly color = computed(() => songColor(this.song()));
  readonly seed = computed(() => seedOf('song:' + this.song().id));
  readonly first = computed(() => firstLine(this.song()));
  readonly coverSize = computed(() => 44);
  readonly learned = computed(() => this.firebase.learnedSongs().has(this.song().id));
  readonly side = computed(() => this.showStatus()
    ? (this.learned() ? 'Aprendida' : 'Aprendendo')
    : (this.data.toqueById().get(this.song().toque[0])?.name ?? ''));
  readonly statusColor = computed(() => this.showStatus() ? (this.learned() ? 'var(--n-ok)' : 'var(--n-tx3)') : 'var(--n-tx2)');

  play(): void {
    const q = this.queue().length ? this.queue() : [this.song().id];
    this.player.playSongs(q, this.song().id);
  }
}

/** A toque as a wide coloured card with its berimbau pattern. */
@Component({
  selector: 'app-novo-toque-card',
  standalone: true,
  imports: [RouterLink, NovoPatternComponent],
  template: `
    <a [routerLink]="['/novo/toques', toque().id]" class="flex flex-col gap-3.5 p-5 min-h-[190px] h-full box-border rounded-[18px] text-white hover:no-underline transition-transform hover:-translate-y-0.5"
       [style.background]="color()">
      <span class="flex justify-between items-baseline gap-2">
        <span class="text-xs font-extrabold tracking-[0.1em] uppercase text-white/85">{{ category() }}</span>
        <span class="text-[13px] font-bold text-white/90">{{ count() === 0 ? 'Sem cantigas ainda' : count() + (count() === 1 ? ' cantiga' : ' cantigas') }}</span>
      </span>
      <span class="n-disp text-[22px] md:text-2xl font-bold tracking-[-0.03em] leading-[1.05]">{{ toque().name }}</span>
      <span class="mt-auto"><app-novo-pattern [toqueId]="toque().id" size="s" [onColor]="true" /></span>
    </a>
  `,
})
export class NovoToqueCardComponent {
  toque = input.required<Toque>();
  private data = inject(DataService);
  readonly color = computed(() => toqueColor(this.toque().id));
  readonly category = computed(() => CATEGORY_LABEL[this.toque().category]);
  readonly count = computed(() => this.data.songsByToque().get(this.toque().id)?.length ?? 0);
}
