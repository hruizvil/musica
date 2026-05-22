import { Component, inject, input, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../../core/services/data.service';
import { FirebaseService } from '../../../core/services/firebase.service';
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

        <!-- Header — always visible -->
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
        @if (isAccessible()) {
          <div class="bg-white dark:bg-stone-800 rounded-xl p-6 border border-stone-200 dark:border-stone-700">
            <h2 class="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4">Letra</h2>
            <app-lyrics-display [lyrics]="song()!.lyrics" [translation]="song()!.translation" />
          </div>
        } @else {
          <div class="bg-white dark:bg-stone-800 rounded-xl p-8 border border-stone-200 dark:border-stone-700 text-center space-y-4">
            <svg class="w-8 h-8 text-stone-300 mx-auto" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
            <div class="space-y-1">
              <p class="text-sm font-semibold text-stone-700 dark:text-stone-200">Conteúdo exclusivo para membros</p>
              <p class="text-sm text-stone-400">Letra e tradução disponíveis com assinatura Abadá Música ($2.99/mês).</p>
            </div>
            <a routerLink="/membership"
               class="inline-block px-6 py-2.5 rounded-xl bg-capoeira-gold text-capoeira-brown font-bold text-sm hover:bg-capoeira-gold/90 transition-colors">
              Seja Membro
            </a>
          </div>
        }

        <!-- Audio embeds — only for accessible songs -->
        @if (isAccessible()) {
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
  private firebase = inject(FirebaseService);

  song = computed(() => this.data.songById().get(this.id()));
  typeLabel = computed(() => SONG_TYPE_LABELS[this.song()?.type ?? ''] ?? '');
  isAccessible = computed(() =>
    !!this.song()?.preview || this.firebase.membershipActive() || this.firebase.isAdmin()
  );

  toqueName(id: string): string { return this.data.toqueById().get(id)?.name ?? id; }
}
