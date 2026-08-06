import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../../core/services/data.service';
import { FirebaseService } from '../../../core/services/firebase.service';
import { Song } from '../../../core/models/song.model';

/**
 * The one song card. Every list that shows songs uses this — song list, Minhas,
 * related songs — so a change to how a song reads happens in a single place.
 */
@Component({
  selector: 'app-song-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    <a [routerLink]="['/musicas', song().id]"
       class="group flex flex-col gap-2 p-3 sm:p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 shadow-sm hover:shadow-lg hover:border-capoeira-gold/40 hover:-translate-y-0.5 transition-all duration-200">
      <div class="flex items-center gap-1.5 justify-end min-h-[1rem]">
        @if (firebase.learnedSongs().has(song().id)) {
          <span title="Aprendida" class="text-emerald-500 text-xs leading-none">✓</span>
        }
        @if (firebase.favorites().has(song().id)) {
          <span title="Favorita" class="text-red-400 text-xs leading-none">♥</span>
        }
      </div>
      <span class="text-[15px] font-bold text-stone-800 dark:text-stone-100 group-hover:text-capoeira-brown dark:group-hover:text-capoeira-gold leading-snug line-clamp-2">
        {{ song().title }}
      </span>
      @if (song().toque.length) {
        <span class="text-xs text-stone-500 font-medium truncate mt-auto">{{ toqueName(song().toque[0]) }}</span>
      }
    </a>
  `,
})
export class SongCardComponent {
  song = input.required<Song>();

  private data = inject(DataService);
  readonly firebase = inject(FirebaseService);

  toqueName(id: string): string {
    return this.data.toqueById().get(id)?.name ?? id;
  }
}
