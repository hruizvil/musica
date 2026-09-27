import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../../core/services/data.service';
import { FirebaseService } from '../../../core/services/firebase.service';
import { FavoritesService } from '../../../core/services/favorites.service';
import { Song } from '../../../core/models/song.model';

/**
 * The one song card. Every list that shows songs uses this — song list, Minhas,
 * related songs — so a change to how a song reads happens in a single place.
 *
 * The heart is a real button you can tap from any list. That rules out the card being
 * one big <a>: a button inside a link is invalid and the tap would open the song. So the
 * title is the link, stretched over the whole card, and the heart sits above it.
 */
@Component({
  selector: 'app-song-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="group relative flex flex-col gap-2 p-3 sm:p-4 min-h-[6.5rem] rounded-2xl bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 shadow-sm hover:shadow-lg hover:border-capoeira-gold/40 hover:-translate-y-0.5 transition-all duration-200">
      <a [routerLink]="['/musicas', song().id]"
         class="stretched-link after:rounded-2xl pr-9 text-[15px] font-bold text-stone-800 dark:text-stone-100 group-hover:text-capoeira-brown dark:group-hover:text-capoeira-gold leading-snug line-clamp-2">
        {{ song().title }}
      </a>
      <div class="mt-auto flex items-center gap-1.5 min-w-0">
        @if (song().toque.length) {
          <span class="text-xs text-stone-500 font-medium truncate">{{ toqueName(song().toque[0]) }}</span>
        }
        @if (firebase.learnedSongs().has(song().id)) {
          <span title="Aprendida" class="ml-auto text-emerald-600 text-xs leading-none shrink-0">✓</span>
        }
      </div>

      <!-- z-10 lifts the heart above the stretched link, so a tap here favourites the
           song instead of opening it. -->
      <button type="button" (click)="favorites.toggle(song().id)"
        [attr.aria-pressed]="isFavorite()"
        [attr.aria-label]="(isFavorite() ? 'Remover ' : 'Favoritar ') + song().title"
        [attr.title]="isFavorite() ? 'Remover das favoritas' : 'Favoritar'"
        class="absolute top-1 right-1 z-10 w-11 h-11 flex items-center justify-center rounded-xl transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
        [class]="isFavorite() ? 'text-red-600' : 'text-stone-400 hover:text-red-500'">
        <svg class="w-5 h-5" viewBox="0 0 24 24" [attr.fill]="isFavorite() ? 'currentColor' : 'none'"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>
        </svg>
      </button>
    </div>
  `,
})
export class SongCardComponent {
  song = input.required<Song>();

  private data = inject(DataService);
  readonly firebase = inject(FirebaseService);
  readonly favorites = inject(FavoritesService);

  isFavorite(): boolean {
    return this.firebase.favorites().has(this.song().id);
  }

  toqueName(id: string): string {
    return this.data.toqueById().get(id)?.name ?? id;
  }
}
