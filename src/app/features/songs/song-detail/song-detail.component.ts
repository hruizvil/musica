import { Component, inject, input, computed, signal } from '@angular/core';
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

        <!-- Back + actions -->
        <div class="flex flex-wrap items-center gap-2">
          <a routerLink="/musicas" class="flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-capoeira-brown dark:hover:text-capoeira-gold px-3 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex-1">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            Músicas
          </a>

          @if (firebase.currentUser() && !firebase.isAdmin()) {
            <div class="flex items-center gap-2 no-print">
              <!-- Favorite -->
              <button (click)="toggleFavorite()" [title]="isFavorite() ? 'Remover favorita' : 'Adicionar aos favoritos'"
                class="flex items-center gap-1 px-3 py-2 rounded-xl border text-sm transition-colors shadow-sm"
                [class]="isFavorite()
                  ? 'border-red-200 bg-red-50 text-red-500 dark:bg-red-900/20 dark:border-red-800'
                  : 'border-stone-200 dark:border-stone-700 text-stone-400 hover:text-red-400 hover:border-red-200'">
                {{ isFavorite() ? '♥' : '♡' }}
              </button>

              <!-- Learned — only for accessible songs -->
              @if (isAccessible()) {
                <button (click)="toggleLearned()" [title]="isLearned() ? 'Marcar como não aprendida' : 'Marcar como aprendida'"
                  class="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium whitespace-nowrap transition-colors shadow-sm"
                  [class]="isLearned()
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800'
                    : 'border-stone-200 dark:border-stone-700 text-stone-400 hover:text-emerald-500 hover:border-emerald-200'">
                  {{ isLearned() ? '✓ Aprendida' : 'Marcar aprendida' }}
                </button>
              }

              <!-- Print -->
              @if (isAccessible()) {
                <button (click)="print()" title="Imprimir letra"
                  class="no-print flex items-center gap-1 px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-400 hover:text-capoeira-brown dark:hover:text-capoeira-gold hover:border-capoeira-gold transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                  </svg>
                </button>
              }
            </div>
          }
        </div>

        <!-- Header — always visible -->
        <div>
          <div class="flex flex-wrap gap-2 mb-2">
            <span class="px-2 py-0.5 rounded-full text-xs bg-capoeira-gold/10 text-capoeira-brown dark:text-capoeira-gold font-medium">
              {{ typeLabel() }}
            </span>
            @for (t of song()!.toque; track t) {
              <a [routerLink]="['/toques', t]" class="no-print px-2 py-0.5 rounded-full text-xs bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400 hover:bg-capoeira-gold/10 hover:text-capoeira-gold transition-colors">
                {{ toqueName(t) }}
              </a>
            }
          </div>
          <h1 class="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-capoeira-brown dark:text-capoeira-cream">
            {{ song()!.title }}
          </h1>
          @if (song()!.composer || song()!.mestre) {
            <p class="text-stone-500 mt-1">{{ song()!.composer || song()!.mestre }}</p>
          }
        </div>

        <!-- Lyrics -->
        @if (isAccessible()) {
          @if (song()!.refrao) {
            <div class="bg-amber-50/80 dark:bg-amber-900/15 rounded-xl p-5 border border-amber-200 dark:border-amber-800 shadow-sm">
              <h2 class="text-xs font-semibold text-amber-500 dark:text-amber-400 uppercase tracking-wide mb-3">Refrão</h2>
              @if (song()!.refraoTranslation) {
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <pre class="font-sans text-sm text-stone-700 dark:text-stone-300 whitespace-pre-wrap leading-relaxed">{{ song()!.refrao }}</pre>
                  <pre class="font-sans text-sm text-stone-500 dark:text-stone-400 whitespace-pre-wrap leading-relaxed italic">{{ song()!.refraoTranslation }}</pre>
                </div>
              } @else {
                <pre class="font-sans text-sm text-stone-700 dark:text-stone-300 whitespace-pre-wrap leading-relaxed">{{ song()!.refrao }}</pre>
              }
            </div>
          }
          <div class="bg-white dark:bg-stone-900 rounded-xl p-6 border border-stone-100 dark:border-stone-800 shadow-sm">
            <h2 class="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4 no-print">Letra</h2>
            <app-lyrics-display [lyrics]="song()!.lyrics" [translation]="song()!.translation" />
          </div>
        } @else {
          <div class="bg-white dark:bg-stone-900 rounded-xl p-5 sm:p-8 border border-stone-100 dark:border-stone-800 shadow-sm text-center space-y-4 no-print">
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

        <!-- Audio embeds -->
        @if (isAccessible()) {
          @if (song()!.audioLinks.youtube) {
            <div class="no-print">
              <h2 class="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Áudio — YouTube</h2>
              <app-youtube-embed [videoId]="song()!.audioLinks.youtube!" [title]="song()!.title" />
            </div>
          }
          @if (song()!.audioLinks.spotify) {
            <div class="no-print">
              <h2 class="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Áudio — Spotify</h2>
              <app-spotify-embed [spotifyUri]="song()!.audioLinks.spotify!" [title]="song()!.title" />
            </div>
          }
        }

        <!-- Notes -->
        @if (song()!.notes) {
          <div class="border-l-4 border-capoeira-gold bg-capoeira-gold/5 dark:bg-capoeira-gold/10 rounded-r-lg p-4 text-sm text-stone-600 dark:text-stone-300">
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
  readonly firebase = inject(FirebaseService);

  song = computed(() => this.data.songById().get(this.id()));
  typeLabel = computed(() => SONG_TYPE_LABELS[this.song()?.type ?? ''] ?? '');
  isAccessible = computed(() => true);
  isFavorite = computed(() => this.firebase.favorites().has(this.id()));
  isLearned = computed(() => this.firebase.learnedSongs().has(this.id()));

  toqueName(id: string): string { return this.data.toqueById().get(id)?.name ?? id; }

  toggleFavorite() { this.firebase.toggleFavorite(this.id()); }
  toggleLearned() { this.firebase.toggleLearned(this.id()); }
  print() { window.print(); }
}
