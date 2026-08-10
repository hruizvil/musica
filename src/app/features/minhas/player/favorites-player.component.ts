import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../../core/services/data.service';
import { FirebaseService } from '../../../core/services/firebase.service';
import { Song } from '../../../core/models/song.model';
import { YoutubeEmbedComponent } from '../../../shared/components/youtube-embed/youtube-embed.component';
import { ActionBarComponent, ActionItem } from '../../../shared/components/action-bar/action-bar.component';

/**
 * Plays through the favourites, one after another. This replaces the roda queue: the
 * list is simply what has been starred, so there is nothing to build up beforehand and
 * nothing to reorder — a song leaves the list by being un-starred.
 *
 * Order is the order they were starred. Firestore stores favourites with arrayUnion,
 * which keeps insertion order, and a JS Set preserves it, so it arrives here for free.
 */
@Component({
  selector: 'app-favorites-player',
  standalone: true,
  imports: [RouterLink, YoutubeEmbedComponent, ActionBarComponent],
  template: `
    <div class="space-y-5">

      <div class="flex items-center gap-3 flex-wrap">
        <a routerLink="/minhas"
           class="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-semibold text-stone-500 dark:text-stone-400 hover:text-capoeira-brown dark:hover:text-capoeira-gold hover:border-capoeira-gold transition-colors shadow-sm">
          ← Minhas
        </a>
        @if (playlist().length) {
          <p class="text-xs font-bold uppercase tracking-widest text-stone-400">
            A tocar · {{ activeIndex() + 1 }} de {{ playlist().length }}
          </p>
        }
      </div>

      @if (!firebase.currentUser()) {
        <div class="rounded-xl border border-capoeira-gold/30 bg-capoeira-gold/5 dark:bg-capoeira-gold/10 p-6 text-center space-y-3">
          <p class="text-sm text-stone-600 dark:text-stone-300">
            Entre na sua conta para guardar favoritas e tocá-las em sequência.
          </p>
          <a routerLink="/login"
             class="inline-block px-4 py-2 rounded-xl bg-capoeira-gold text-capoeira-brown font-bold text-sm hover:bg-amber-400 transition-colors">
            Entrar
          </a>
        </div>
      } @else if (!playlist().length) {
        <div class="text-center py-16 px-4">
          <p class="text-stone-400 max-w-sm mx-auto leading-relaxed">
            Você ainda não tem favoritas. Abra uma música e toque no
            <span class="text-red-400 font-semibold">♥</span> para montar a sua lista.
          </p>
          <a routerLink="/musicas" class="inline-block mt-4 text-sm font-semibold text-capoeira-brown dark:text-capoeira-gold hover:underline">
            Ver músicas →
          </a>
        </div>
      } @else {
        <!-- Player first on a phone, list beside it from lg. The song being played is what
             the screen is for; the queue is reference. -->
        <div class="lg:grid lg:grid-cols-[2fr_3fr] lg:gap-8 lg:items-start">

          <div class="lg:order-2 space-y-3">
            <h2 class="font-display text-lg font-bold text-stone-800 dark:text-stone-100 truncate">
              {{ activeSong()!.title }}
            </h2>

            @if (activeSong()!.audioLinks.youtube) {
              <app-youtube-embed [videoId]="activeSong()!.audioLinks.youtube!" [title]="activeSong()!.title" />
            } @else {
              <div class="w-full aspect-video rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 text-sm">
                Vídeo não disponível
              </div>
            }

            <!-- Anterior and Próxima are pinned: transport that hides in a menu is
                 worse than useless. Only Aleatório may fold away. -->
            <div class="flex items-center justify-between gap-3">
              <a [routerLink]="['/musicas', activeSong()!.id]"
                 class="shrink-0 px-1.5 py-2 rounded text-xs text-stone-400 hover:text-capoeira-gold hover:underline">
                Ver letra completa
              </a>
              <app-action-bar class="flex-1 min-w-0"
                [actions]="transport()" ariaLabel="Controles de reprodução"
                (triggered)="onAction($event)" />
            </div>
          </div>

          <ol class="lg:order-1 mt-6 lg:mt-0 space-y-1.5">
            @for (song of playlist(); track song.id; let i = $index) {
              <li class="flex items-center gap-2.5 rounded-xl border transition-colors"
                  [class]="song.id === activeSong()!.id
                    ? 'border-capoeira-gold/50 bg-capoeira-gold/10'
                    : 'border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900'">
                <button type="button" (click)="play(song.id)"
                        class="flex-1 min-w-0 text-left flex items-center gap-2.5 px-3 py-2.5">
                  @if (song.id === activeSong()!.id) {
                    <span aria-hidden="true" class="flex items-end gap-[2px] h-3 shrink-0">
                      <span class="w-[3px] h-[60%] rounded-sm bg-capoeira-gold"></span>
                      <span class="w-[3px] h-full rounded-sm bg-capoeira-gold"></span>
                      <span class="w-[3px] h-[40%] rounded-sm bg-capoeira-gold"></span>
                    </span>
                  } @else {
                    <span class="w-4 shrink-0 text-[11px] tabular-nums text-stone-400">{{ i + 1 }}</span>
                  }
                  <span class="min-w-0">
                    <span class="block text-sm font-semibold text-stone-800 dark:text-stone-100 truncate">{{ song.title }}</span>
                    @if (song.toque.length) {
                      <span class="block text-[11px] text-stone-400 truncate">{{ toqueNames(song) }}</span>
                    }
                  </span>
                </button>
                <!-- Un-starring is how a song leaves the list; there is no separate remove. -->
                <button type="button" (click)="unfavorite(song.id)"
                  [attr.aria-label]="'Remover ' + song.title + ' das favoritas'"
                  title="Remover das favoritas"
                  class="w-9 h-9 mr-1 shrink-0 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  ♥
                </button>
              </li>
            }
          </ol>

        </div>
      }
    </div>
  `,
})
export class FavoritesPlayerComponent {
  private data = inject(DataService);
  readonly firebase = inject(FirebaseService);

  /** Chosen by id, so un-starring a song never leaves a stale index pointing elsewhere. */
  private activeId = signal<string | null>(null);

  /** Null when playing in starred order; otherwise the shuffled order of ids. */
  readonly shuffled = signal<string[] | null>(null);

  readonly playlist = computed<Song[]>(() => {
    const favorites = this.firebase.favorites();
    const order = this.shuffled();

    // Reconcile rather than rebuild: a shuffle stays put while songs are starred and
    // un-starred around it, so the running order does not reshuffle under the player.
    const ids = order
      ? [...order.filter(id => favorites.has(id)), ...[...favorites].filter(id => !order.includes(id))]
      : [...favorites];

    const byId = this.data.songById();
    return ids.map(id => byId.get(id)).filter((s): s is Song => !!s);
  });

  readonly activeSong = computed(() => {
    const songs = this.playlist();
    if (!songs.length) return null;
    return songs.find(s => s.id === this.activeId()) ?? songs[0];
  });

  readonly activeIndex = computed(() => {
    const active = this.activeSong();
    return active ? this.playlist().findIndex(s => s.id === active.id) : -1;
  });

  /** Pinned first, as the action bar expects: transport keeps its place, shuffle folds. */
  readonly transport = computed<ActionItem[]>(() => [
    {
      id: 'prev', label: 'Anterior', icon: 'prev', pinned: true,
      disabled: this.activeIndex() <= 0,
    },
    {
      id: 'next', label: 'Próxima', icon: 'next', pinned: true,
      disabled: this.activeIndex() >= this.playlist().length - 1,
    },
    {
      id: 'shuffle', label: 'Aleatório', icon: 'shuffle',
      active: !!this.shuffled(), state: this.shuffled() ? 'ligado' : 'desligado',
    },
  ]);

  onAction(id: string): void {
    if (id === 'prev') this.prev();
    else if (id === 'next') this.next();
    else if (id === 'shuffle') this.toggleShuffle();
  }

  play(id: string): void {
    this.activeId.set(id);
  }

  next(): void {
    const songs = this.playlist();
    const idx = this.activeIndex();
    if (idx < 0 || idx >= songs.length - 1) return;
    this.play(songs[idx + 1].id);
  }

  prev(): void {
    const idx = this.activeIndex();
    if (idx <= 0) return;
    this.play(this.playlist()[idx - 1].id);
  }

  toggleShuffle(): void {
    if (this.shuffled()) {
      this.shuffled.set(null);
      return;
    }
    const active = this.activeSong()?.id;
    // Fisher-Yates over everything except what is playing, which stays at the front so
    // turning shuffle on does not cut off the song already going.
    const rest = [...this.firebase.favorites()].filter(id => id !== active);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    this.shuffled.set(active ? [active, ...rest] : rest);
  }

  async unfavorite(id: string): Promise<void> {
    // Step off the song first: once it is un-starred it leaves the list, and the player
    // would otherwise fall back to the top rather than carrying on where it was.
    if (this.activeId() === id || this.activeSong()?.id === id) {
      const songs = this.playlist();
      const idx = songs.findIndex(s => s.id === id);
      const neighbour = songs[idx + 1] ?? songs[idx - 1];
      this.activeId.set(neighbour?.id ?? null);
    }
    try {
      await this.firebase.toggleFavorite(id);
    } catch {
      // The write failed; the heart stays as it was. Nothing to undo locally.
    }
  }

  toqueNames(song: Song): string {
    return song.toque.map(t => this.data.toqueById().get(t)?.name ?? t).join(', ');
  }
}
