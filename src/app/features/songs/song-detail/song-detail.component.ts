import { Component, inject, input, computed, signal, linkedSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../../core/services/data.service';
import { FirebaseService } from '../../../core/services/firebase.service';
import { RodaService } from '../../../core/services/roda.service';
import { YoutubeEmbedComponent } from '../../../shared/components/youtube-embed/youtube-embed.component';
import { SpotifyEmbedComponent } from '../../../shared/components/spotify-embed/spotify-embed.component';
import { TabBarComponent, TabOption } from '../../../shared/components/tab-bar/tab-bar.component';
import { SegmentedControlComponent, SegmentOption } from '../../../shared/components/segmented-control/segmented-control.component';

type SongTab = 'coro' | 'letra' | 'sobre';
type Language = 'both' | 'pt' | 'en';

const LANGUAGE_KEY = 'capoeira-lyrics-language';

@Component({
  selector: 'app-song-detail',
  standalone: true,
  imports: [RouterLink, YoutubeEmbedComponent, SpotifyEmbedComponent, TabBarComponent, SegmentedControlComponent],
  template: `
    @if (song()) {
      <div class="w-full">

        <!-- Breadcrumb -->
        <nav class="flex items-center gap-1.5 text-sm text-stone-400 mb-6 no-print">
          <a routerLink="/musicas" class="py-1.5 -my-1.5 hover:text-capoeira-gold transition-colors">Músicas</a>
          <span class="text-stone-300 dark:text-stone-600">›</span>
          <span class="text-stone-600 dark:text-stone-300 truncate max-w-[280px]">{{ song()!.title }}</span>
        </nav>

        <!-- Two columns from md, as the tablet step calls for; the sidebar only sticks
             once it has a column of its own. -->
        <div class="md:grid md:grid-cols-[3fr_2fr] md:gap-8 lg:gap-10 md:items-start">

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
                     class="no-print px-3 py-1.5 rounded-full text-xs font-semibold bg-capoeira-gold/10 text-capoeira-brown dark:text-capoeira-gold border border-capoeira-gold/20 hover:bg-capoeira-gold/20 transition-colors">
                    RITMO: {{ toqueName(t).toUpperCase() }}
                  </a>
                }
              </div>
            </div>

            <!-- Video leads the page at every width: the recording is what the song
                 actually is, and the words are read against it. Everything else
                 follows underneath. -->
            @if (song()!.audioLinks.youtube) {
              <!-- Capped between sm and md: in that range the page is still one column,
                   and a full-bleed 16:9 player would push every line of the song off
                   screen. From md the grid column already sets the width. -->
              <div class="no-print sm:max-w-2xl md:max-w-none">
                <app-youtube-embed [videoId]="song()!.audioLinks.youtube!" [title]="song()!.title" />
              </div>
            }

            <!-- Action buttons bar. No "Ouvir no YouTube" button: the embedded player
                 already surfaces a "Watch on YouTube" link at every screen size, so a
                 separate button just duplicates it. -->
            <div class="flex flex-wrap gap-2 no-print">
              <button (click)="toggleRoda()"
                [attr.aria-pressed]="inRoda()"
                [attr.aria-label]="inRoda() ? 'Na roda — remover' : 'Adicionar à roda'"
                [attr.title]="inRoda() ? 'Na roda — remover' : 'Adicionar à roda'"
                class="no-print flex items-center gap-1.5 px-4 py-2 sm:py-1.5 rounded-xl border text-sm font-medium transition-colors shadow-sm"
                [class]="inRoda()
                  ? 'border-capoeira-gold/40 bg-capoeira-gold/10 text-capoeira-brown dark:text-capoeira-gold'
                  : 'border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:text-capoeira-brown dark:hover:text-capoeira-gold hover:border-capoeira-gold bg-white dark:bg-stone-900'">
                <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="8" stroke-width="2" />
                  @if (inRoda()) { <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4" /> }
                </svg>
                <span class="hidden lg:inline">{{ inRoda() ? 'Na roda — remover' : 'Adicionar à roda' }}</span>
              </button>
              @if (firebase.currentUser() && !firebase.isAdmin()) {
                <button (click)="toggleFavorite()"
                  [attr.aria-pressed]="isFavorite()"
                  [attr.aria-label]="isFavorite() ? 'Remover dos favoritos' : 'Favoritar'"
                  [attr.title]="isFavorite() ? 'Remover dos favoritos' : 'Favoritar'"
                  class="flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition-colors shadow-sm"
                  [class]="isFavorite()
                    ? 'border-red-200 bg-red-50 text-red-500 dark:bg-red-900/20 dark:border-red-800'
                    : 'border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:text-red-400 hover:border-red-200 bg-white dark:bg-stone-900'">
                  <span class="text-base leading-none shrink-0">{{ isFavorite() ? '♥' : '♡' }}</span>
                  <span class="hidden lg:inline">{{ isFavorite() ? 'Favoritada' : 'Favoritar' }}</span>
                </button>
                <button (click)="toggleLearned()"
                  [attr.aria-pressed]="isLearned()"
                  [attr.aria-label]="isLearned() ? 'Marcar como não aprendida' : 'Marcar como aprendida'"
                  [attr.title]="isLearned() ? 'Marcar como não aprendida' : 'Marcar como aprendida'"
                  class="flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition-colors shadow-sm"
                  [class]="isLearned()
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800'
                    : 'border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:text-emerald-500 hover:border-emerald-200 bg-white dark:bg-stone-900'">
                  <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span class="hidden lg:inline">{{ isLearned() ? 'Aprendida' : 'Marcar aprendida' }}</span>
                </button>
              }
              <button (click)="print()" aria-label="Imprimir ou salvar em PDF" title="Imprimir ou salvar em PDF"
                class="no-print flex items-center gap-1.5 px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:text-capoeira-brown dark:hover:text-capoeira-gold hover:border-capoeira-gold text-sm font-medium transition-colors bg-white dark:bg-stone-900 shadow-sm">
                <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                </svg>
                <span class="hidden lg:inline">PDF / Imprimir</span>
              </button>
              <button (click)="share()"
                [attr.aria-label]="shareLabel()" [attr.title]="shareLabel()"
                class="no-print flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition-colors shadow-sm"
                [class]="shared()
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800'
                  : shareFailed()
                    ? 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800'
                    : 'border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:text-capoeira-brown dark:hover:text-capoeira-gold hover:border-capoeira-gold bg-white dark:bg-stone-900'">
                @if (shared()) {
                  <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                } @else {
                  <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.7 10.7a3 3 0 100 2.6m0-2.6l6.6-3.4m-6.6 6l6.6 3.4M18 7a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm0 10a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
                  </svg>
                }
                <span class="hidden lg:inline">{{ shareLabel() }}</span>
              </button>
            </div>

            <!-- Section tabs, then the language choice for whichever section is
                 showing. Only tabs with something behind them are offered. -->
            <div class="flex flex-wrap items-center gap-3 no-print">
              <app-tab-bar
                [tabs]="tabs()" [active]="activeTab()" idPrefix="song"
                ariaLabel="Seções da música"
                (selected)="activeTab.set($any($event))" />

              @if (showLanguage()) {
                <app-segmented-control
                  [options]="languages" [value]="language()"
                  ariaLabel="Idioma da letra"
                  (selected)="setLanguage($any($event))" />
              }
            </div>

            <!-- Panels are hidden rather than removed so that printing can bring the
                 whole song back — a PDF of just the tab that happened to be open
                 would be missing verses. See .print-show in styles.css. -->
            @if (song()!.refrao) {
              <div id="song-panel-coro" role="tabpanel" aria-labelledby="song-tab-coro"
                class="print-show bg-amber-50/80 dark:bg-amber-900/15 rounded-xl p-5 border border-amber-200 dark:border-amber-800 shadow-sm"
                [class.hidden]="activeTab() !== 'coro'">
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                    <svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
                    </svg>
                  </div>
                  <h2 class="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Coro</h2>
                </div>
                @if (song()!.refraoTranslation && language() === 'both') {
                  <!-- Side by side only from lg. At md the reading column is about
                       400px wide, and splitting that in two leaves each verse too
                       narrow to read. -->
                  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <pre class="font-sans text-sm text-stone-700 dark:text-stone-300 whitespace-pre-wrap leading-relaxed">{{ song()!.refrao }}</pre>
                    <pre class="font-sans text-sm text-stone-500 dark:text-stone-400 whitespace-pre-wrap leading-relaxed italic border-l border-amber-200 dark:border-amber-700 pl-4">{{ song()!.refraoTranslation }}</pre>
                  </div>
                } @else if (song()!.refraoTranslation && language() === 'en') {
                  <pre class="font-sans text-sm text-stone-500 dark:text-stone-400 whitespace-pre-wrap leading-relaxed italic">{{ song()!.refraoTranslation }}</pre>
                } @else {
                  <pre class="font-sans text-sm text-stone-700 dark:text-stone-300 whitespace-pre-wrap leading-relaxed">{{ song()!.refrao }}</pre>
                }
              </div>
            }

            <div id="song-panel-letra" role="tabpanel" aria-labelledby="song-tab-letra"
              class="print-show bg-white dark:bg-stone-900 rounded-xl border border-stone-100 dark:border-stone-800 shadow-sm p-6"
              [class.hidden]="activeTab() !== 'letra'">
              <h2 class="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4 no-print">Letra</h2>
              @if (song()!.translation && language() === 'both') {
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <pre class="font-display text-base leading-relaxed whitespace-pre-line text-stone-800 dark:text-stone-200">{{ song()!.lyrics }}</pre>
                  <pre class="font-display text-base leading-relaxed whitespace-pre-line text-stone-500 dark:text-stone-400 italic lg:border-l lg:border-stone-100 lg:dark:border-stone-800 lg:pl-6">{{ song()!.translation }}</pre>
                </div>
              } @else if (song()!.translation && language() === 'en') {
                <pre class="font-display text-base leading-relaxed whitespace-pre-line text-stone-500 dark:text-stone-400 italic">{{ song()!.translation }}</pre>
              } @else {
                <pre class="font-display text-base leading-relaxed whitespace-pre-line text-stone-800 dark:text-stone-200">{{ song()!.lyrics }}</pre>
              }
            </div>

            <div id="song-panel-sobre" role="tabpanel" aria-labelledby="song-tab-sobre"
              class="print-show space-y-4" [class.hidden]="activeTab() !== 'sobre'">
              @if (song()!.notes) {
                <div class="border-l-4 border-capoeira-gold bg-capoeira-gold/5 dark:bg-capoeira-gold/10 rounded-r-xl p-5">
                  <h3 class="text-xs font-bold text-capoeira-gold uppercase tracking-widest mb-2">Sobre esta música</h3>
                  <p class="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">{{ song()!.notes }}</p>
                </div>
              }

              <div class="bg-white dark:bg-stone-900 rounded-xl border border-stone-100 dark:border-stone-800 shadow-sm p-5 space-y-3">
                @if (song()!.toque.length) {
                  <div class="flex items-start gap-3 text-sm">
                    <span class="text-lg shrink-0 mt-0.5">🥁</span>
                    <div>
                      <p class="text-xs text-stone-400 font-medium mb-0.5">Ritmo</p>
                      <p class="text-stone-700 dark:text-stone-200 font-medium">{{ song()!.toque.map(toqueName).join(', ') }}</p>
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
                      <p class="text-xs text-stone-400 font-medium mb-0.5">Compositor</p>
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
            </div>

          </div>

          <!-- ═══ RIGHT COLUMN ═══ -->
          <div class="mt-8 md:mt-0 space-y-5 md:sticky md:top-6 no-print">

            <!-- Spotify -->
            @if (song()!.audioLinks.spotify) {
              <div>
                <h2 class="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Spotify</h2>
                <app-spotify-embed [spotifyUri]="song()!.audioLinks.spotify!" [title]="song()!.title" />
              </div>
            }

            <!-- Song details are not repeated here: they live behind the Sobre tab,
                 so the sidebar stays media plus what to sing next. -->

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
  private roda = inject(RodaService);

  song = computed(() => this.data.songById().get(this.id()));

  /** Only sections with something in them become tabs. */
  readonly tabs = computed<TabOption<SongTab>[]>(() => {
    const song = this.song();
    if (!song) return [];
    const tabs: TabOption<SongTab>[] = [];
    if (song.refrao) tabs.push({ value: 'coro', label: 'Coro' });
    if (song.lyrics) tabs.push({ value: 'letra', label: 'Letra' });
    tabs.push({ value: 'sobre', label: 'Sobre' });
    return tabs;
  });

  /** Keeps the chosen tab across songs when it still exists, and falls back to the
   *  first available one when it does not — otherwise moving from a song with a coro
   *  to one without would leave every panel hidden. */
  readonly activeTab = linkedSignal<TabOption<SongTab>[], SongTab>({
    source: () => this.tabs(),
    computation: (tabs, previous) => {
      const kept = previous?.value;
      return kept && tabs.some(t => t.value === kept) ? kept : (tabs[0]?.value ?? 'letra');
    },
  });

  readonly languages: SegmentOption<Language>[] = [
    { value: 'both', label: 'Ambos' },
    { value: 'pt', label: 'Português' },
    { value: 'en', label: 'Inglês' },
  ];
  readonly language = signal<Language>(this.storedLanguage());

  /** The choice only means something where a translation exists to choose between. */
  readonly showLanguage = computed(() => {
    const song = this.song();
    if (!song) return false;
    if (this.activeTab() === 'coro') return !!song.refraoTranslation;
    if (this.activeTab() === 'letra') return !!song.translation;
    return false;
  });

  setLanguage(language: Language): void {
    this.language.set(language);
    try {
      localStorage.setItem(LANGUAGE_KEY, language);
    } catch {
      // storage unavailable (private mode) — the choice still holds for this session
    }
  }

  private storedLanguage(): Language {
    try {
      const stored = localStorage.getItem(LANGUAGE_KEY);
      return stored === 'pt' || stored === 'en' ? stored : 'both';
    } catch {
      return 'both';
    }
  }
  isAccessible = computed(() => true);
  isFavorite = computed(() => this.firebase.favorites().has(this.id()));
  isLearned = computed(() => this.firebase.learnedSongs().has(this.id()));
  inRoda = computed(() => this.roda.has(this.id()));

  readonly author = computed(() => this.song()?.composer ?? null);
  readonly authorInitials = computed(() => {
    const a = this.author();
    if (!a) return '?';
    return a.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
  });
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
  toqueName = (id: string): string => this.data.toqueById().get(id)?.name ?? id;

  toggleFavorite() { this.firebase.toggleFavorite(this.id()); }
  toggleLearned() { this.firebase.toggleLearned(this.id()); }
  toggleRoda() {
    if (this.inRoda()) this.roda.remove(this.id());
    else this.roda.add(this.id());
  }
  print() { window.print(); }

  /** Confirms the copy in the button itself, so sharing needs no toast. */
  readonly shared = signal(false);
  readonly shareFailed = signal(false);
  private sharedTimer?: ReturnType<typeof setTimeout>;

  readonly shareLabel = computed(() => {
    if (this.shared()) return 'Link copiado';
    if (this.shareFailed()) return 'Copie o link da barra de endereço';
    return 'Compartilhar';
  });

  async share(): Promise<void> {
    const song = this.song();
    if (!song) return;
    const url = location.href;

    // The share sheet is the right thing on a phone; everywhere else, copy the link.
    if (navigator.share) {
      try {
        await navigator.share({ title: song.title, url });
        return;
      } catch {
        // dismissed, or not permitted here — fall through to copying
      }
    }

    let copied: boolean;
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch {
      // The async clipboard needs a focused document and a permission the browser
      // may withhold; the old selection-based copy usually still goes through.
      copied = this.copyBySelection(url);
    }
    this.flashShareResult(copied);
  }

  private copyBySelection(text: string): boolean {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.top = '0';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    let ok: boolean;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    document.body.removeChild(field);
    return ok;
  }

  /** Say which way it went. A share button that silently does nothing when the
   *  clipboard is blocked reads as broken. */
  private flashShareResult(copied: boolean): void {
    clearTimeout(this.sharedTimer);
    this.shared.set(copied);
    this.shareFailed.set(!copied);
    this.sharedTimer = setTimeout(() => {
      this.shared.set(false);
      this.shareFailed.set(false);
    }, 2400);
  }
}
