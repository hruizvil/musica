import { Component, inject, input, computed, signal, linkedSignal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../../core/services/data.service';
import { FirebaseService } from '../../../core/services/firebase.service';
import { FavoritesService } from '../../../core/services/favorites.service';
import { YoutubeEmbedComponent } from '../../../shared/components/youtube-embed/youtube-embed.component';
import { SpotifyEmbedComponent } from '../../../shared/components/spotify-embed/spotify-embed.component';
import { TabBarComponent, TabOption } from '../../../shared/components/tab-bar/tab-bar.component';
import { SegmentedControlComponent, SegmentOption } from '../../../shared/components/segmented-control/segmented-control.component';
import { ActionBarComponent, ActionItem } from '../../../shared/components/action-bar/action-bar.component';

/** Coro is always on screen, so only these two are ever tabbed — and only on a phone. */
type SongTab = 'letra' | 'sobre';
type Language = 'both' | 'pt' | 'en';

const LANGUAGE_KEY = 'capoeira-lyrics-language';

/**
 * The song page reads differently by width, on purpose.
 *
 * On a phone the video leads and everything else is rationed: one row of controls,
 * then the coro. Five stacked control rows used to push the coro off screen, which is
 * the one thing someone opens this page to find mid-roda.
 *
 * From lg it is the two-column page it always was — video and details in a sticky
 * sidebar, the song running down the left with nothing hidden behind a tab. A wide
 * screen has room for the whole song, so it shows the whole song.
 */
@Component({
  selector: 'app-song-detail',
  standalone: true,
  imports: [
    RouterLink, YoutubeEmbedComponent, SpotifyEmbedComponent, TabBarComponent,
    SegmentedControlComponent, ActionBarComponent,
  ],
  template: `
    @if (song()) {
      <div class="w-full">

        <!-- Breadcrumb -->
        <nav class="flex items-center gap-1.5 text-sm text-stone-400 mb-6 no-print">
          <a routerLink="/musicas" class="py-1.5 -my-1.5 hover:text-capoeira-gold transition-colors">Músicas</a>
          <span class="text-stone-300 dark:text-stone-600">›</span>
          <span class="text-stone-600 dark:text-stone-300 truncate max-w-[280px]">{{ song()!.title }}</span>
        </nav>

        <!-- The two wrappers below are display:contents until lg, so their children take
             part in this flex column directly, so order can interleave them: title,
             video, song, details. From lg the wrappers become the two grid columns and
             the ordering stops mattering. -->
        <div class="flex flex-col gap-6 lg:grid lg:grid-cols-[3fr_2fr] lg:gap-10 lg:items-start">

          <!-- ═══ LEFT COLUMN ═══ -->
          <div class="contents lg:block lg:space-y-6">

            <!-- Title -->
            <div class="order-1">
              <h1 class="font-display text-3xl sm:text-4xl font-bold text-capoeira-brown dark:text-capoeira-cream leading-tight mb-3">
                {{ song()!.title }}
              </h1>

              @if (author()) {
                <div class="flex items-center gap-2.5 mb-4">
                  <div class="w-8 h-8 rounded-full bg-capoeira-gold/20 border border-capoeira-gold/30 flex items-center justify-center shrink-0">
                    <span class="text-xs font-bold text-capoeira-gold">{{ authorInitials() }}</span>
                  </div>
                  <span class="text-sm text-stone-600 dark:text-stone-300 font-medium">{{ author() }}</span>
                </div>
              }

              <div class="flex flex-wrap gap-2">
                @for (t of song()!.toque; track t) {
                  <a [routerLink]="['/toques', t]"
                     class="no-print px-3 py-1.5 rounded-full text-xs font-semibold bg-capoeira-gold/10 text-capoeira-brown dark:text-capoeira-gold border border-capoeira-gold/20 hover:bg-capoeira-gold/20 transition-colors">
                    RITMO: {{ toqueName(t).toUpperCase() }}
                  </a>
                }
              </div>
            </div>

            <!-- Song body: one action row, then the coro, then the rest -->
            <div class="order-3 space-y-6">

              <!-- ─── The single action row ─── -->
              <!-- One bar at every width now. It keeps whatever fits on the line and
                   folds the rest into ⋯, measured from real space rather than a
                   breakpoint — the sidebar changes width without the window doing so. -->
              <div class="no-print">
                <app-action-bar
                  [actions]="actions()" ariaLabel="Ações da música"
                  (triggered)="onAction($event)">

                  @if (speedPanelOpen() && player(); as p) {
                    <button type="button" (click)="speedPanelOpen.set(false)"
                      aria-label="Fechar velocidade" class="fixed inset-0 z-40 cursor-default"></button>

                    <div class="absolute right-0 top-12 z-50 w-64 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-xl p-3 space-y-3">
                      <div>
                        <p class="text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-1.5">Velocidade</p>
                        <div class="flex gap-1.5">
                          @for (rate of p.speedOptions; track rate) {
                            <button type="button" (click)="p.setSpeed(rate)"
                              [attr.aria-pressed]="p.speed() === rate"
                              class="flex-1 py-2 rounded-lg text-xs font-bold transition-colors"
                              [class]="p.speed() === rate
                                ? 'bg-capoeira-gold/15 text-capoeira-brown dark:text-capoeira-gold'
                                : 'text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'">
                              {{ rate }}×
                            </button>
                          }
                        </div>
                      </div>
                      <div>
                        <p class="text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-1.5">Início do loop</p>
                        <div class="flex items-center gap-1.5">
                          <input #startField type="text" inputmode="numeric"
                            [value]="p.startLabel()" (change)="p.onStartInput(startField)"
                            aria-label="Tempo de início do loop (m:ss)"
                            class="w-16 py-2 bg-transparent border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-semibold text-center text-capoeira-brown dark:text-capoeira-gold outline-none focus:ring-1 focus:ring-capoeira-gold/50" />
                          <button type="button" (click)="p.captureCurrentTime()"
                            class="px-2.5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide text-stone-400 hover:text-capoeira-gold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                            Aqui
                          </button>
                          @if (p.startSeconds() > 0) {
                            <button type="button" (click)="p.setStart(0)" title="Voltar o início para 0:00"
                              class="w-8 h-8 shrink-0 flex items-center justify-center rounded-full text-stone-300 dark:text-stone-600 hover:text-capoeira-gold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                              ×
                            </button>
                          }
                        </div>
                      </div>
                    </div>
                  }
                </app-action-bar>

                @if (shareLabel() !== 'Compartilhar') {
                  <p class="mt-2 text-right text-xs font-semibold"
                    [class]="shared() ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-500'">
                    {{ shareLabel() }}
                  </p>
                }
              </div>


              <!-- Coro. Never behind a tab: it is what someone reaches for mid-roda. -->
              @if (song()!.refrao) {
                <div class="bg-amber-50/80 dark:bg-amber-900/15 rounded-xl p-5 border border-amber-200 dark:border-amber-800 shadow-sm">
                  <div class="flex items-center gap-2 mb-3">
                    <div class="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                      <svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
                      </svg>
                    </div>
                    <h2 class="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Coro</h2>
                  </div>
                  @if (song()!.refraoTranslation) {
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <pre class="font-sans text-sm text-stone-700 dark:text-stone-300 whitespace-pre-wrap leading-relaxed md:block"
                        [class.hidden]="language() === 'en'">{{ song()!.refrao }}</pre>
                      <pre class="font-sans text-sm text-stone-500 dark:text-stone-400 whitespace-pre-wrap leading-relaxed italic lg:border-l lg:border-amber-200 lg:dark:border-amber-700 lg:pl-4 md:block"
                        [class.hidden]="language() === 'pt'">{{ song()!.refraoTranslation }}</pre>
                    </div>
                  } @else {
                    <pre class="font-sans text-sm text-stone-700 dark:text-stone-300 whitespace-pre-wrap leading-relaxed">{{ song()!.refrao }}</pre>
                  }
                </div>
              }

              <!-- Tabs are a phone affordance only. From md there is room to show the
                   letra and the sobre together, so both are simply on the page. -->
              <div class="flex flex-wrap items-center gap-3 no-print md:hidden">
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

              <!-- md:block re-reveals what the phone tabs hide, and .print-show brings
                   the whole song back for a PDF whichever tab happened to be open. -->
              @if (song()!.lyrics) {
                <div id="song-panel-letra" role="tabpanel" aria-labelledby="song-tab-letra"
                  class="print-show md:block bg-white dark:bg-stone-900 rounded-xl border border-stone-100 dark:border-stone-800 shadow-sm p-6"
                  [class.hidden]="activeTab() !== 'letra'">
                  <h2 class="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4 no-print">Letra</h2>
                  @if (song()!.translation) {
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <pre class="font-display text-base leading-relaxed whitespace-pre-line text-stone-800 dark:text-stone-200 md:block"
                        [class.hidden]="language() === 'en'">{{ song()!.lyrics }}</pre>
                      <pre class="font-display text-base leading-relaxed whitespace-pre-line text-stone-500 dark:text-stone-400 italic lg:border-l lg:border-stone-100 lg:dark:border-stone-800 lg:pl-6 md:block"
                        [class.hidden]="language() === 'pt'">{{ song()!.translation }}</pre>
                    </div>
                  } @else {
                    <pre class="font-display text-base leading-relaxed whitespace-pre-line text-stone-800 dark:text-stone-200">{{ song()!.lyrics }}</pre>
                  }
                </div>
              }

              @if (song()!.notes) {
                <div id="song-panel-sobre" role="tabpanel" aria-labelledby="song-tab-sobre"
                  class="print-show md:block border-l-4 border-capoeira-gold bg-capoeira-gold/5 dark:bg-capoeira-gold/10 rounded-r-xl p-5"
                  [class.hidden]="activeTab() !== 'sobre'">
                  <h3 class="text-xs font-bold text-capoeira-gold uppercase tracking-widest mb-2">Sobre esta música</h3>
                  <p class="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">{{ song()!.notes }}</p>
                </div>
              }
            </div>
          </div>

          <!-- ═══ RIGHT COLUMN ═══ -->
          <div class="contents lg:block lg:space-y-5 lg:sticky lg:top-6 no-print">

            <!-- Video. Second on a phone, first in the sidebar from lg. Its own controls
                 are off: loop, speed and loop-start all live in the action bar. -->
            @if (song()!.audioLinks.youtube) {
              <div class="order-2">
                <h2 class="hidden lg:block text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Vídeo</h2>
                <app-youtube-embed
                  [videoId]="song()!.audioLinks.youtube!" [title]="song()!.title"
                  [showControls]="false" />
              </div>
            }


            <!-- Details and what to sing next -->
            <div class="order-4 space-y-5">

              @if (song()!.audioLinks.spotify) {
                <div>
                  <h2 class="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Spotify</h2>
                  <app-spotify-embed [spotifyUri]="song()!.audioLinks.spotify!" [title]="song()!.title" />
                </div>
              }

              <!-- Back in the sidebar where it was, rather than behind a Sobre tab. -->
              <div>
                <h2 class="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Detalhes da Música</h2>
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
  private readonly favorites = inject(FavoritesService);

  /** Read through a viewChild rather than a template variable: the embed sits inside an
   *  @if, and a reference declared in an embedded view is not visible to its siblings. */
  readonly player = viewChild(YoutubeEmbedComponent);

  song = computed(() => this.data.songById().get(this.id()));

  readonly speedPanelOpen = signal(false);

  /**
   * Priority order — the earliest survives longest as the row narrows. Playback comes
   * first because it is what gets touched while a song is running; printing and sharing
   * are done once, sitting down, and are the first to fold into the menu.
   */
  readonly actions = computed<ActionItem[]>(() => {
    const items: ActionItem[] = [];
    const p = this.player();

    // First, and for everyone. It used to be hidden from signed-out visitors and from
    // the admin account, so the feature was invisible to most people who opened a song.
    // Signed out, the heart opens the sign-in prompt rather than doing nothing.
    items.push({
      id: 'favorite',
      label: this.isFavorite() ? 'Remover dos favoritos' : 'Favoritar',
      icon: this.isFavorite() ? 'heart-filled' : 'heart',
      active: this.isFavorite(), tone: 'favorite',
    });

    if (p) {
      items.push({
        id: 'loop', label: 'Repetir sem parar', icon: 'loop',
        active: p.loop(), state: p.loop() ? 'sim' : 'não',
      });
      if (!p.apiFailed()) {
        items.push({
          id: 'speed', label: 'Velocidade e início do loop', icon: 'clock',
          badge: p.speed() + '×',
          active: p.speed() !== 1 || p.startSeconds() > 0,
          state: p.speed() + '× · início ' + p.startLabel(),
        });
      }
    }

    if (this.firebase.currentUser()) {
      items.push({
        id: 'learned',
        label: this.isLearned() ? 'Marcar como não aprendida' : 'Marcar como aprendida',
        icon: 'check', active: this.isLearned(), tone: 'learned',
      });
    }

    items.push({ id: 'print', label: 'PDF / Imprimir', icon: 'print' });
    items.push({ id: 'share', label: 'Compartilhar', icon: 'share' });
    return items;
  });

  onAction(id: string): void {
    if (id === 'loop') this.player()?.toggleLoop();
    else if (id === 'speed') this.speedPanelOpen.update(open => !open);
    else if (id === 'favorite') void this.favorites.toggle(this.id());
    else if (id === 'learned') void this.toggleLearned();
    else if (id === 'print') this.print();
    else if (id === 'share') void this.share();
  }

  /** Phone-only tabs, so only the two long sections are ever hidden. */
  readonly tabs = computed<TabOption<SongTab>[]>(() => {
    const song = this.song();
    if (!song) return [];
    const tabs: TabOption<SongTab>[] = [];
    if (song.lyrics) tabs.push({ value: 'letra', label: 'Letra' });
    if (song.notes) tabs.push({ value: 'sobre', label: 'Sobre' });
    return tabs;
  });

  /** Keeps the chosen tab across songs when it still exists, and falls back to the
   *  first available one when it does not. */
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
    return !!song.translation || !!song.refraoTranslation;
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

  isFavorite = computed(() => this.firebase.favorites().has(this.id()));
  isLearned = computed(() => this.firebase.learnedSongs().has(this.id()));

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

  /** Awaited so a failed write cannot become an unhandled rejection; the mark is put
   *  back by the service rather than the page pretending it saved. */
  async toggleLearned(): Promise<void> {
    try {
      await this.firebase.toggleLearned(this.id());
    } catch {
      // as above
    }
  }

  print() { window.print(); }

  /** Confirms the copy beside the button, so sharing needs no toast. */
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

  /** Say which way it went. A share action that silently does nothing when the
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
