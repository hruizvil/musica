import { Component, inject, input, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../../core/services/data.service';
import { LyricsDisplayComponent } from '../../../shared/components/lyrics-display/lyrics-display.component';
import { YoutubeEmbedComponent } from '../../../shared/components/youtube-embed/youtube-embed.component';
import { SpotifyEmbedComponent } from '../../../shared/components/spotify-embed/spotify-embed.component';

const SONG_TYPE_LABELS: Record<string, string> = {
  ladainha: 'Ladainha', corrido: 'Corrido', louvacao: 'Louvação', quadra: 'Quadra'
};

@Component({
  selector: 'app-song-detail',
  standalone: true,
  imports: [RouterLink, LyricsDisplayComponent, YoutubeEmbedComponent, SpotifyEmbedComponent],
  template: `
    @if (song()) {
      <div class="max-w-2xl space-y-8">

        <!-- Back -->
        <a routerLink="/musicas" class="text-sm text-stone-400 hover:text-capoeira-gold flex items-center gap-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          Músicas
        </a>

        <!-- Header -->
        <div>
          <div class="flex flex-wrap gap-2 mb-2">
            <span class="px-2 py-0.5 rounded-full text-xs bg-capoeira-gold/10 text-capoeira-brown dark:text-capoeira-gold font-medium">
              {{ typeLabel() }}
            </span>
            @for (t of song()!.toque; track t) {
              <a [routerLink]="['/toques', t]" class="px-2 py-0.5 rounded-full text-xs bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400 hover:bg-capoeira-gold/10 hover:text-capoeira-gold transition-colors">
                {{ toqueName(t) }}
              </a>
            }
          </div>
          <h1 class="font-display text-3xl font-bold text-capoeira-brown dark:text-capoeira-cream">
            {{ song()!.title }}
          </h1>
          @if (song()!.composer) {
            <p class="text-stone-500 mt-1">{{ song()!.composer }}</p>
          }
        </div>

        <!-- Lyrics -->
        <div class="bg-white dark:bg-stone-800 rounded-xl p-6 border border-stone-200 dark:border-stone-700">
          <h2 class="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4">Letra</h2>
          <app-lyrics-display [lyrics]="song()!.lyrics" [translation]="song()!.translation" />
        </div>

        <!-- Audio embeds -->
        @if (song()!.audioLinks.youtube) {
          <div>
            <h2 class="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Áudio — YouTube</h2>
            <app-youtube-embed [videoId]="song()!.audioLinks.youtube!" [title]="song()!.title" />
          </div>
        }
        @if (song()!.audioLinks.spotify) {
          <div>
            <h2 class="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Áudio — Spotify</h2>
            <app-spotify-embed [spotifyUri]="song()!.audioLinks.spotify!" [title]="song()!.title" />
          </div>
        }

        <!-- Notes -->
        @if (song()!.notes) {
          <div class="bg-capoeira-gold/5 border border-capoeira-gold/20 rounded-lg p-4 text-sm text-stone-600 dark:text-stone-300">
            {{ song()!.notes }}
          </div>
        }

      </div>
    } @else {
      <p class="text-stone-400 text-center py-16">Música não encontrada.</p>
    }
  `,
})
export class SongDetailComponent {
  id = input.required<string>();
  private data = inject(DataService);

  song = computed(() => this.data.songById().get(this.id()));
  typeLabel = computed(() => SONG_TYPE_LABELS[this.song()?.type ?? ''] ?? '');
  toqueName(id: string): string { return this.data.toqueById().get(id)?.name ?? id; }
}
