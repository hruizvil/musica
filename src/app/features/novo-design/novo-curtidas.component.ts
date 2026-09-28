import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { FirebaseService } from '../../core/services/firebase.service';
import { Song } from '../../core/models/song.model';
import { NovoPlayerService } from './novo-player.service';
import { NovoCoverComponent, NovoIconComponent } from './novo-ui';
import { NovoSongRowComponent } from './novo-parts';
import { LEARNED_COLOR, LIKED_COLOR } from './novo-data';

/** The student's two lists: Curtidas (in the order they were liked) and Aprendidas. */
@Component({
  selector: 'app-novo-curtidas',
  standalone: true,
  imports: [RouterLink, NovoCoverComponent, NovoIconComponent, NovoSongRowComponent],
  template: `
    <div class="max-w-[1100px] mx-auto px-4 md:px-10 py-6 md:py-10 flex flex-col gap-6">
      <div role="tablist" aria-label="Listas" class="flex gap-2">
        <a routerLink="/novo/curtidas" role="tab" [attr.aria-selected]="!learnedTab()" class="h-10 px-4 rounded-full inline-flex items-center text-sm font-bold border hover:no-underline"
           [class]="!learnedTab() ? 'bg-[var(--n-tx)] text-[var(--n-bg)] border-[var(--n-tx)]' : 'border-[var(--n-line)]'">Curtidas</a>
        <a routerLink="/novo/curtidas" [queryParams]="{ lista: 'aprendidas' }" role="tab" [attr.aria-selected]="learnedTab()" class="h-10 px-4 rounded-full inline-flex items-center text-sm font-bold border hover:no-underline"
           [class]="learnedTab() ? 'bg-[var(--n-tx)] text-[var(--n-bg)] border-[var(--n-tx)]' : 'border-[var(--n-line)]'">Aprendidas</a>
      </div>

      <div class="flex flex-col sm:flex-row sm:items-end gap-5 md:gap-7">
        <app-novo-cover [color]="learnedTab() ? learnedColor : likedColor" [size]="160" [radius]="24" [icon]="learnedTab() ? 'check' : 'heart'" />
        <div class="flex flex-col gap-2.5">
          <span class="text-[13px] font-extrabold tracking-[0.1em] uppercase text-[var(--n-acc-tx)]">Sua lista</span>
          <h1 class="m-0 n-disp text-4xl md:text-6xl font-bold tracking-[-0.05em] leading-[0.95]">{{ learnedTab() ? 'Aprendidas' : 'Curtidas' }}</h1>
          <span class="text-base text-[var(--n-tx2)]">{{ songs().length }} {{ songs().length === 1 ? 'cantiga' : 'cantigas' }}{{ learnedTab() ? '' : ' · na ordem em que você curtiu' }}</span>
          @if (songs().length) {
            <div class="flex gap-2.5 mt-1.5">
              <button type="button" (click)="playAll()" class="h-12 px-5 rounded-xl bg-[var(--n-acc)] text-[#1a1400] inline-flex items-center gap-2 text-base font-extrabold"><app-novo-icon name="play" [size]="16" />Tocar tudo</button>
              <button type="button" (click)="shuffle()" class="h-12 px-[18px] rounded-xl border border-[var(--n-line)] inline-flex items-center gap-2 text-base font-bold"><app-novo-icon name="shuffle" [size]="18" />Aleatório</button>
            </div>
          }
        </div>
      </div>

      @if (!firebase.currentUser() && firebase.pendingSignedIn()) {
        <div aria-hidden="true" class="h-40 rounded-2xl bg-[var(--n-raise)] animate-pulse"></div>
      } @else if (!firebase.currentUser()) {
        <div class="p-6 rounded-2xl border border-dashed border-[var(--n-line)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p class="m-0 text-[15px] text-[var(--n-tx2)]">Entre com o Google para guardar suas curtidas e marcar o que já aprendeu, em qualquer aparelho.</p>
          <a routerLink="/login" [queryParams]="{ returnUrl: router.url }" class="h-11 px-5 rounded-xl bg-[var(--n-acc)] text-[#1a1400] font-extrabold inline-flex items-center justify-center hover:no-underline">Entrar com Google</a>
        </div>
      } @else {
        <div class="flex flex-col gap-0.5">
          @for (s of songs(); track s.id; let i = $index) {
            <app-novo-song-row [song]="s" [n]="i + 1" [queue]="ids()" [showStatus]="!learnedTab()" />
          } @empty {
            <p class="m-0 py-10 text-[15px] text-[var(--n-tx2)]">
              {{ learnedTab() ? 'Nenhuma cantiga marcada como aprendida ainda. Abra uma cantiga e toque em “Aprendi”.' : 'Nenhuma curtida ainda. Toque no coração de uma cantiga para guardá-la aqui.' }}
            </p>
            <a routerLink="/novo/cantigas" class="self-start h-11 px-5 rounded-xl border border-[var(--n-line)] inline-flex items-center font-bold hover:no-underline">Ver as cantigas</a>
          }
        </div>
      }
    </div>
  `,
})
export class NovoCurtidasComponent {
  private data = inject(DataService);
  readonly firebase = inject(FirebaseService);
  private player = inject(NovoPlayerService);
  readonly router = inject(Router);

  lista = input<string>();
  readonly likedColor = LIKED_COLOR;
  readonly learnedColor = LEARNED_COLOR;

  readonly learnedTab = computed(() => this.lista() === 'aprendidas');
  readonly songs = computed<Song[]>(() => {
    const ids = this.learnedTab() ? this.firebase.learnedSongs() : this.firebase.favorites();
    const byId = this.data.songById();
    return [...ids].map(id => byId.get(id)).filter((s): s is Song => !!s);
  });
  readonly ids = computed(() => this.songs().map(s => s.id));

  playAll(): void { this.player.playSongs(this.ids()); }

  shuffle(): void {
    const ids = [...this.ids()];
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    this.player.playSongs(ids);
  }
}
