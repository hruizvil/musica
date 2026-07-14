import { Component, inject, input, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../../core/services/data.service';
import { FirebaseService } from '../../../core/services/firebase.service';
import { YoutubeEmbedComponent } from '../../../shared/components/youtube-embed/youtube-embed.component';
import { SpotifyEmbedComponent } from '../../../shared/components/spotify-embed/spotify-embed.component';

const TYPE_LABELS: Record<string, string> = {
  ladainha: 'Ladainha', corrido: 'Corrido', louvacao: 'Louvação', quadra: 'Quadra'
};

@Component({
  selector: 'app-song-detail',
  standalone: true,
  imports: [RouterLink, YoutubeEmbedComponent, SpotifyEmbedComponent],
  template: `
    @if (song()) {
      <div class="w-full">

        <!-- Breadcrumb -->
        <nav class="flex items-center gap-1.5 text-sm text-stone-400 mb-6 no-print">
          <a routerLink="/musicas" class="hover:text-capoeira-gold transition-colors">Músicas</a>
          <span class="text-stone-300 dark:text-stone-600">›</span>
          <span class="text-stone-600 dark:text-stone-300 truncate max-w-[280px]">{{ song()!.title }}</span>
        </nav>

        <div class="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-10 lg:items-start">

          <!-- ═══ LEFT COLUMN ═══ -->
          <div class="space-y-6">

            <!-- Title -->
            <div>
              <h1 class="font-display text-3xl sm:text-4xl font-bold text-capoeira-brown dark:text-capoeira-cream leading-tight mb-3">
                {{ song()!.title }}
              </h1>

              <!-- Author row -->
              @if (author()) {
                <div class="flex items-center gap-2.5 mb-4">
                  <div class="w-8 h-8 rounded-full bg-capoeira-gold/20 border border-capoeira-gold/30 flex items-center justify-center shrink-0">
                    <span class="text-xs font-bold text-capoeira-gold">{{ authorInitials() }}</span>
                  </div>
                  <span class="text-sm text-stone-600 dark:text-stone-300 font-medium">{{ author() }}</span>
                </div>
              }

              <!-- Tags row -->
              <div class="flex flex-wrap gap-2">
                @for (t of song()!.toque; track t) {
                  <a [routerLink]="['/toques', t]"
                     class="no-print px-3 py-1 rounded-full text-xs font-semibold bg-capoeira-gold/10 text-capoeira-brown dark:text-capoeira-gold border border-capoeira-gold/20 hover:bg-capoeira-gold/20 transition-colors">
                    RITMO: {{ toqueName(t).toUpperCase() }}
                  </a>
                }
                @if (typeLabel()) {
                  <span class="px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700">
                    {{ typeLabel().toUpperCase() }}
                  </span>
                }
              </div>
            </div>

            <!-- Action buttons bar -->
            <div class="flex flex-wrap gap-2 no-print">
              @if (song()!.audioLinks.youtube) {
                <a [href]="'https://www.youtube.com/watch?v=' + song()!.audioLinks.youtube"
                   target="_blank" rel="noopener"
                   class="flex items-center gap-2 px-4 py-2 rounded-xl bg-capoeira-gold text-capoeira-brown font-bold text-sm hover:bg-amber-400 transition-colors shadow-sm shadow-capoeira-gold/20">
                  <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6a3 3 0 00-2.1 2.1C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
                  </svg>
                  Ouvir no YouTube
                </a>
              }
              @if (firebase.currentUser() && !firebase.isAdmin()) {
                <button (click)="toggleFavorite()"
                  class="flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition-colors shadow-sm"
                  [class]="isFavorite()
                    ? 'border-red-200 bg-red-50 text-red-500 dark:bg-red-900/20 dark:border-red-800'
                    : 'border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:text-red-400 hover:border-red-200 bg-white dark:bg-stone-900'">
                  {{ isFavorite() ? '♥ Favoritada' : '♡ Favoritar' }}
                </button>
                <button (click)="toggleLearned()"
                  class="flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition-colors shadow-sm"
                  [class]="isLearned()
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800'
                    : 'border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:text-emerald-500 hover:border-emerald-200 bg-white dark:bg-stone-900'">
                  {{ isLearned() ? '✓ Aprendida' : 'Marcar aprendida' }}
                </button>
              }
              <button (click)="print()"
                class="no-print flex items-center gap-1.5 px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:text-capoeira-brown dark:hover:text-capoeira-gold hover:border-capoeira-gold text-sm font-medium transition-colors bg-white dark:bg-stone-900 shadow-sm">
                <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                </svg>
                PDF / Imprimir
              </button>
            </div>

            <!-- Refrão -->
            @if (song()!.refrao) {
              <div class="bg-amber-50/80 dark:bg-amber-900/15 rounded-xl p-5 border border-amber-200 dark:border-amber-800 shadow-sm">
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                    <svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
                    </svg>
                  </div>
                  <h2 class="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Refrão</h2>
                </div>
                @if (song()!.refraoTranslation) {
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <pre class="font-sans text-sm text-stone-700 dark:text-stone-300 whitespace-pre-wrap leading-relaxed">{{ song()!.refrao }}</pre>
                    <pre class="font-sans text-sm text-stone-500 dark:text-stone-400 whitespace-pre-wrap leading-relaxed italic border-l border-amber-200 dark:border-amber-700 pl-4">{{ song()!.refraoTranslation }}</pre>
                  </div>
                } @else {
                  <pre class="font-sans text-sm text-stone-700 dark:text-stone-300 whitespace-pre-wrap leading-relaxed">{{ song()!.refrao }}</pre>
                }
              </div>
            }

            <!-- Letra with tabs -->
            <div class="bg-white dark:bg-stone-900 rounded-xl border border-stone-100 dark:border-stone-800 shadow-sm overflow-hidden">
              <!-- Tab bar -->
              @if (song()!.translation) {
                <div class="flex border-b border-stone-100 dark:border-stone-800 no-print">
                  <button (click)="activeTab.set('pt')"
                    class="px-5 py-3 text-sm font-semibold transition-colors border-b-2"
                    [class]="activeTab() === 'pt'
                      ? 'border-capoeira-gold text-capoeira-brown dark:text-capoeira-gold'
                      : 'border-transparent text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'">
                    Português
                  </button>
                  <button (click)="activeTab.set('en')"
                    class="px-5 py-3 text-sm font-semibold transition-colors border-b-2"
                    [class]="activeTab() === 'en'
                      ? 'border-capoeira-gold text-capoeira-brown dark:text-capoeira-gold'
                      : 'border-transparent text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'">
                    English
                  </button>
                </div>
              } @else {
                <div class="px-6 pt-4 pb-0">
                  <h2 class="text-xs font-semibold text-stone-400 uppercase tracking-wide no-print">Letra</h2>
                </div>
              }
              <div class="p-6">
                @if (activeTab() === 'pt' || !song()!.translation) {
                  <pre class="font-display text-base leading-relaxed whitespace-pre-line text-stone-800 dark:text-stone-200">{{ song()!.lyrics }}</pre>
                } @else {
                  <pre class="font-display text-base leading-relaxed whitespace-pre-line text-stone-600 dark:text-stone-300 italic">{{ song()!.translation }}</pre>
                }
                <!-- Print: always show both -->
                @if (song()!.translation) {
                  <div class="hidden print:block mt-6 pt-6 border-t border-stone-200">
                    <p class="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">English</p>
                    <pre class="font-display text-base leading-relaxed whitespace-pre-line text-stone-600 italic">{{ song()!.translation }}</pre>
                  </div>
                }
              </div>
            </div>

            <!-- Sobre esta música -->
            @if (song()!.notes) {
              <div class="border-l-4 border-capoeira-gold bg-capoeira-gold/5 dark:bg-capoeira-gold/10 rounded-r-xl p-5">
                <h3 class="text-xs font-bold text-capoeira-gold uppercase tracking-widest mb-2">Sobre esta música</h3>
                <p class="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">{{ song()!.notes }}</p>
              </div>
            }

          </div>

          <!-- ═══ RIGHT COLUMN ═══ -->
          <div class="mt-8 lg:mt-0 space-y-5 lg:sticky lg:top-6 no-print">

            <!-- Video -->
            @if (song()!.audioLinks.youtube) {
              <div>
                <h2 class="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Vídeo</h2>
                <app-youtube-embed [videoId]="song()!.audioLinks.youtube!" [title]="song()!.title" />
              </div>
            }

            <!-- Spotify -->
            @if (song()!.audioLinks.spotify) {
              <div>
                <h2 class="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Spotify</h2>
                <app-spotify-embed [spotifyUri]="song()!.audioLinks.spotify!" [title]="song()!.title" />
              </div>
            }

            <!-- Detalhes da música -->
            <div class="bg-white dark:bg-stone-900 rounded-xl border border-stone-100 dark:border-stone-800 shadow-sm p-5 space-y-3">
              <h2 class="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Detalhes da Música</h2>

              @if (song()!.toque.length) {
                <div class="flex items-start gap-3 text-sm">
                  <span class="text-lg shrink-0 mt-0.5">🥁</span>
                  <div>
                    <p class="text-xs text-stone-400 font-medium mb-0.5">Ritmo</p>
                    <p class="text-stone-700 dark:text-stone-200 font-medium">{{ song()!.toque.map(toqueName).join(', ') }}</p>
                  </div>
                </div>
              }

              @if (typeLabel()) {
                <div class="flex items-start gap-3 text-sm">
                  <span class="text-lg shrink-0 mt-0.5">🎵</span>
                  <div>
                    <p class="text-xs text-stone-400 font-medium mb-0.5">Tipo</p>
                    <p class="text-stone-700 dark:text-stone-200 font-medium">{{ typeLabel() }}</p>
                  </div>
                </div>
              }

              @if (instruments()) {
                <div class="flex items-start gap-3 text-sm">
                  <span class="text-lg shrink-0 mt-0.5">🎸</span>
                  <div>
                    <p class="text-xs text-stone-400 font-medium mb-0.5">Instrumentos</p>
                    <p class="text-stone-700 dark:text-stone-200 font-medium">{{ instruments() }}</p>
                  </div>
                </div>
              }

              @if (author()) {
                <div class="flex items-start gap-3 text-sm">
                  <span class="text-lg shrink-0 mt-0.5">👤</span>
                  <div>
                    <p class="text-xs text-stone-400 font-medium mb-0.5">Autor</p>
                    <p class="text-stone-700 dark:text-stone-200 font-medium">{{ author() }}</p>
                  </div>
                </div>
              }

              @if (song()!.album) {
                <div class="flex items-start gap-3 text-sm">
                  <span class="text-lg shrink-0 mt-0.5">💿</span>
                  <div>
                    <p class="text-xs text-stone-400 font-medium mb-0.5">Álbum</p>
                    <p class="text-stone-700 dark:text-stone-200 font-medium">{{ song()!.album }}</p>
                  </div>
                </div>
              }
            </div>

            <!-- Músicas relacionadas -->
            @if (relatedSongs().length) {
              <div>
                <div class="flex items-center justify-between mb-3">
                  <h2 class="text-xs font-bold text-stone-400 uppercase tracking-widest">Músicas Relacionadas</h2>
                  @if (song()!.toque.length) {
                    <a [routerLink]="['/toques', song()!.toque[0]]" class="text-xs text-capoeira-gold hover:underline">Ver todas →</a>
                  }
                </div>
                <div class="space-y-2">
                  @for (related of relatedSongs(); track related.id) {
                    <a [routerLink]="['/musicas', related.id]"
                       class="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 hover:border-capoeira-gold/30 hover:shadow-sm transition-all group">
                      <div class="w-7 h-7 rounded-lg bg-capoeira-gold/10 flex items-center justify-center shrink-0">
                        <svg class="w-3.5 h-3.5 text-capoeira-gold" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
                        </svg>
                      </div>
                      <span class="text-sm font-medium text-stone-700 dark:text-stone-200 group-hover:text-capoeira-brown dark:group-hover:text-capoeira-gold leading-snug line-clamp-2">{{ related.title }}</span>
                    </a>
                  }
                </div>
              </div>
            }

          </div>
        </div>
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
  isAccessible = computed(() => true);
  isFavorite = computed(() => this.firebase.favorites().has(this.id()));
  isLearned = computed(() => this.firebase.learnedSongs().has(this.id()));

  readonly author = computed(() => this.song()?.mestre ?? this.song()?.composer ?? null);
  readonly authorInitials = computed(() => {
    const a = this.author();
    if (!a) return '?';
    return a.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
  });
  readonly typeLabel = computed(() => TYPE_LABELS[this.song()?.type ?? ''] ?? '');
  readonly instruments = computed(() => {
    const song = this.song();
    if (!song || !song.toque.length) return null;
    const toque = this.data.toqueById().get(song.toque[0]);
    return toque?.instruments?.join(', ') ?? null;
  });
  readonly relatedSongs = computed(() => {
    const song = this.song();
    if (!song || !song.toque.length) return [];
    return (this.data.songsByToque().get(song.toque[0]) ?? [])
      .filter(s => s.id !== song.id)
      .slice(0, 5);
  });
  readonly activeTab = signal<'pt' | 'en'>('pt');

  toqueName = (id: string): string => this.data.toqueById().get(id)?.name ?? id;

  toggleFavorite() { this.firebase.toggleFavorite(this.id()); }
  toggleLearned() { this.firebase.toggleLearned(this.id()); }
  print() { window.print(); }
}
