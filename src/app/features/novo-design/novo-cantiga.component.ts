import { Component, OnDestroy, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { FirebaseService } from '../../core/services/firebase.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { Song } from '../../core/models/song.model';
import { NovoPlayerService } from './novo-player.service';
import { NovoCoverComponent, NovoIconComponent } from './novo-ui';
import { TextRun, byTitle, coroIsLyrics, emphasis, hasTranslation, lyricLines, plainText, seedOf, songColor } from './novo-data';
import { NovoLangService } from './novo-lang.service';
import { NovoContentService } from './novo-content.service';
import { NovoSeoService, SITE_ORIGIN } from './novo-seo.service';

/**
 * A song. The lyrics are the page: each line with its translation beneath, and tapping a
 * line makes it the current one, which is what the player strip shows.
 */
@Component({
  selector: 'app-novo-cantiga',
  standalone: true,
  imports: [RouterLink, NovoCoverComponent, NovoIconComponent],
  template: `
    @if (song(); as s) {
      <div class="max-w-[1360px] mx-auto px-4 md:px-10 py-5 md:py-9 grid lg:grid-cols-[300px_minmax(0,1fr)] gap-6 lg:gap-x-12 lg:gap-y-6 items-start">

        <aside class="flex flex-col gap-4 min-w-0">
          <div class="flex lg:flex-col gap-4 items-center lg:items-stretch">
            <app-novo-cover [color]="color()" [title]="s.title" [label]="toqueName()" [size]="300" [radius]="20" [seed]="seed()" class="hidden lg:block" />
            <app-novo-cover [color]="color()" [size]="84" [radius]="14" [seed]="seed()" class="lg:hidden" />
            <div class="min-w-0 flex flex-col gap-1">
              <h1 class="m-0 n-disp text-2xl md:text-[30px] font-bold tracking-[-0.03em] leading-tight">{{ s.title }}</h1>
              <a [routerLink]="L.to('/toques/' + s.toque[0])" class="self-start min-h-10 inline-flex items-center text-[15px] font-bold text-[var(--n-acc-tx)]">{{ toqueName() }}</a>
              @if (s.composer) { <span class="text-sm text-[var(--n-tx3)]">{{ s.composer }}</span> }
            </div>
          </div>
          <button type="button" (click)="play()" class="h-12 rounded-xl bg-[var(--n-acc)] text-[#1a1400] flex items-center justify-center gap-2 text-base font-extrabold">
            <app-novo-icon [name]="isPlaying() ? 'pause' : 'play'" [size]="16" />{{ isPlaying() ? L.s().pause : (isCurrent() ? L.s().continue : L.s().play) }}
          </button>
          @if (!hasRecording()) {
            <p class="m-0 -mt-1 text-[13px] text-[var(--n-tx3)]">{{ toqueVideo() ? L.s().noRecordingToque : L.s().noRecordingAtAll }}</p>
          }
          <div class="flex gap-2">
            <button type="button" (click)="favorites.toggle(s.id)" [attr.aria-pressed]="liked()"
              class="flex-1 h-11 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold"
              [class]="liked() ? 'border-[var(--n-acc)] text-[var(--n-acc-tx)]' : 'border-[var(--n-line)]'">
              <app-novo-icon name="heart" [size]="17" [filled]="liked()" />{{ liked() ? L.s().likedBtn : L.s().like }}
            </button>
            <button type="button" (click)="toggleLearned()" [attr.aria-pressed]="learned()"
              class="flex-1 h-11 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold"
              [class]="learned() ? 'bg-[#047857] border-[#047857] text-white' : 'border-[var(--n-line)]'">
              <app-novo-icon name="check" [size]="17" />{{ learned() ? L.s().learnedBtn : L.s().learnedAsk }}
            </button>
            <button type="button" (click)="share()" [attr.aria-label]="shared() ? L.s().linkCopied : L.s().share" class="w-11 h-11 shrink-0 rounded-xl border border-[var(--n-line)] flex items-center justify-center">
              <app-novo-icon [name]="shared() ? 'check' : 'share'" [size]="17" />
            </button>
          </div>
        </aside>

        <section class="min-w-0 flex flex-col gap-3 lg:row-span-2" aria-labelledby="letra-h">
          <div class="flex items-center justify-between gap-3">
            <h2 id="letra-h" class="m-0 text-[13px] font-extrabold tracking-[0.1em] uppercase text-[var(--n-tx3)]">{{ L.s().lyrics }}</h2>
            @if (translated()) {
              <div class="flex items-center gap-2.5 text-sm font-bold">
                <span id="trad-label">{{ L.s().translation }}</span>
                <button type="button" role="switch" (click)="showEn.set(!showEn())" [attr.aria-checked]="showEn()" aria-labelledby="trad-label"
                  class="relative w-11 h-[26px] rounded-full transition-colors before:content-[''] before:absolute before:-inset-[9px]" [style.background]="showEn() ? 'var(--n-acc)' : 'var(--n-line)'">
                  <span class="absolute top-[3px] w-5 h-5 rounded-full transition-[left]" [style.left.px]="showEn() ? 21 : 3" [style.background]="showEn() ? '#1a1400' : '#ffffff'"></span>
                </button>
              </div>
            }
          </div>
          @if (s.refrao && !coroOnly()) {
            <div class="p-4 rounded-2xl bg-[var(--n-raise)] flex flex-col gap-2">
              <span class="text-xs font-extrabold tracking-[0.1em] uppercase text-[var(--n-acc-tx)]">{{ L.s().coro }}</span>
              <div class="grid gap-x-8 gap-y-1" [class.md:grid-cols-2]="showEn() && !!s.refraoTranslation">
                <p class="m-0 text-lg md:text-[19px] font-bold leading-snug whitespace-pre-line">{{ s.refrao }}</p>
                @if (showEn() && s.refraoTranslation) {
                  <p class="m-0 text-[15px] md:text-base leading-snug whitespace-pre-line text-[var(--n-tx2)]">@for (r of runs(s.refraoTranslation); track $index) {@if (r.em) {<em>{{ r.text }}</em>} @else {{{ r.text }}}}</p>
                }
              </div>
            </div>
          }
          @if (lines().length) {
            <p class="m-0 text-[13px] text-[var(--n-tx3)]">{{ coroOnly() ? L.s().coroOnlyHint : '' }}{{ L.s().tapHint }}</p>
          }
          <ol class="m-0 p-0 list-none flex flex-col">
            @for (line of lines(); track $index; let i = $index) {
              <li [class.mt-4]="line.stanzaStart">
                <button type="button" (click)="pick(i)" [attr.aria-current]="current() === i ? 'true' : null"
                  class="w-full text-left py-2 md:py-1.5 px-3 -mx-3 rounded-lg transition-colors hover:bg-[var(--n-raise)] grid gap-x-8 gap-y-0.5 items-baseline"
                  [class.md:grid-cols-2]="showEn() && !!line.en"
                  [style.background]="current() === i ? 'var(--n-raise)' : ''"
                  [style.box-shadow]="current() === i ? 'inset 3px 0 0 var(--n-acc)' : ''">
                  <span class="block text-[17px] md:text-[19px] font-bold leading-snug text-[var(--n-tx)]">{{ line.pt }}</span>
                  @if (showEn() && line.en) {
                    <span class="block text-[15px] md:text-[17px] leading-snug" [style.color]="current() === i ? 'var(--n-acc-tx)' : 'var(--n-tx2)'">@for (r of runs(line.en); track $index) {@if (r.em) {<em>{{ r.text }}</em>} @else {{{ r.text }}}}</span>
                  }
                </button>
              </li>
            }
          </ol>
        </section>

        <aside class="flex flex-col gap-3.5 min-w-0 lg:col-start-1 lg:row-start-2">
          @if (notes() || themes().length) {
            <div class="p-5 rounded-[18px] bg-[var(--n-surf)] border border-[var(--n-line)] flex flex-col gap-2.5">
              <span class="text-[13px] font-extrabold tracking-[0.1em] uppercase text-[var(--n-tx3)]">{{ L.s().aboutSong }}</span>
              @if (notes(); as n) { <p class="m-0 text-[15px] leading-relaxed text-[var(--n-tx2)]">@for (r of runs(n); track $index) {@if (r.em) {<em>{{ r.text }}</em>} @else {{{ r.text }}}}</p> }
              @if (themes().length) {
                <div class="flex flex-wrap gap-1.5">
                  @for (th of themes(); track $index) {
                    <a [routerLink]="L.to('/cantigas')" [queryParams]="{ q: plain(th) }" class="min-h-9 px-3 rounded-full bg-[var(--n-raise)] inline-flex items-center text-[13px] hover:no-underline">{{ plain(th) }}</a>
                  }
                </div>
              }
            </div>
          }
          @if (same().length) {
            <div class="p-5 rounded-[18px] bg-[var(--n-surf)] border border-[var(--n-line)] flex flex-col gap-1">
              <span class="text-[13px] font-extrabold tracking-[0.1em] uppercase text-[var(--n-tx3)] pb-1.5">{{ L.s().alsoInToque(toqueName()) }}</span>
              @for (o of same(); track o.id) {
                <a [routerLink]="L.to('/cantigas/' + o.id)" class="flex items-center gap-3 py-1.5 hover:no-underline">
                  <app-novo-cover [color]="colorOf(o)" [size]="40" [radius]="8" [seed]="seedOf(o)" />
                  <span class="min-w-0 text-[15px] font-bold truncate">{{ o.title }}</span>
                </a>
              }
            </div>
          }
        </aside>
      </div>
    } @else if (data.songsLoaded()) {
      <div class="max-w-md mx-auto px-4 py-20 text-center flex flex-col gap-4 items-center">
        <h1 class="m-0 n-disp text-2xl font-bold">{{ L.s().songNotFound }}</h1>
        <a [routerLink]="L.to('/cantigas')" class="h-11 px-5 rounded-xl bg-[var(--n-acc)] text-[#1a1400] font-extrabold inline-flex items-center hover:no-underline">{{ L.s().seeAllSongs }}</a>
      </div>
    }
  `,
})
export class NovoCantigaComponent implements OnDestroy {
  readonly data = inject(DataService);
  readonly firebase = inject(FirebaseService);
  readonly favorites = inject(FavoritesService);
  readonly player = inject(NovoPlayerService);
  private router = inject(Router);
  readonly L = inject(NovoLangService);
  private content = inject(NovoContentService);
  private seo = inject(NovoSeoService);

  id = input.required<string>();

  readonly song = computed(() => this.data.songById().get(this.id()));
  readonly lines = computed(() => (this.song() ? lyricLines(this.song()!) : []));
  readonly coroOnly = computed(() => !!this.song() && coroIsLyrics(this.song()!));
  readonly translated = computed(() => !!this.song() && hasTranslation(this.song()!));
  readonly color = computed(() => (this.song() ? songColor(this.song()!) : '#374151'));
  readonly seed = computed(() => seedOf('song:' + this.id()));
  readonly toqueName = computed(() => this.data.toqueById().get(this.song()?.toque[0] ?? '')?.name ?? '');
  readonly liked = computed(() => this.firebase.favorites().has(this.id()));
  readonly learned = computed(() => this.firebase.learnedSongs().has(this.id()));
  readonly isCurrent = computed(() => this.player.isCurrentSong(this.id()));
  readonly isPlaying = computed(() => this.isCurrent() && this.player.playing());
  readonly hasRecording = computed(() => !!this.song()?.audioLinks.youtube);
  readonly toqueVideo = computed(() => (this.song()?.toque ?? []).some(t => !!this.data.videosByToque().get(t)?.length));
  readonly same = computed<Song[]>(() => {
    const s = this.song();
    return s ? [...(this.data.songsByToque().get(s.toque[0]) ?? [])].filter(o => o.id !== s.id).sort(byTitle).slice(0, 5) : [];
  });

  readonly notes = computed(() => (this.song() ? this.content.songNotes(this.song()!) : null));
  readonly themes = computed(() => (this.song() ? this.content.songThemes(this.song()!) : []));

  /** Translations are on by default in English, where they are the point; off in Portuguese. The switch overrides. */
  readonly showEn = linkedSignal(() => this.L.lang() === 'en');
  /** The picked line: the player's while this song plays, otherwise this page's own. */
  private readonly localLine = linkedSignal<string, number | null>({ source: () => this.id(), computation: () => null });
  readonly current = computed<number | null>(() => (this.isCurrent() ? this.player.line() : this.localLine()));

  readonly shared = signal(false);
  private shareTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      const s = this.song(); const d = this.L.s();
      if (!s) {
        if (this.data.songsLoaded()) this.seo.set({ title: d.songNotFound, description: d.notFoundBody, path: '/cantigas/' + this.id(), noindex: true });
        return;
      }
      const lines = this.lines();
      const excerpt = lines.slice(0, 2).map(l => this.L.lang() === 'en' && l.en ? plainText(l.en) : l.pt).join(' / ');
      this.seo.set({
        title: s.title,
        description: d.seoSong(s.title, this.toqueName()) + (excerpt ? ' “' + excerpt + '…”' : ''),
        path: '/cantigas/' + s.id,
        jsonLd: {
          '@type': 'MusicComposition',
          name: s.title,
          url: SITE_ORIGIN + this.L.to('/cantigas/' + s.id),
          genre: 'Capoeira',
          inLanguage: 'pt-BR',
          ...(s.composer ? { composer: { '@type': 'Person', name: s.composer } } : {}),
          ...(this.notes() ? { description: plainText(this.notes()!) } : {}),
          lyrics: { '@type': 'CreativeWork', inLanguage: 'pt-BR', text: lines.map(l => l.pt).join('\n') },
          ...(lines.some(l => l.en) ? { workTranslation: { '@type': 'CreativeWork', inLanguage: 'en', text: lines.map(l => plainText(l.en)).join('\n') } } : {}),
        },
      });
    });
  }

  ngOnDestroy(): void { clearTimeout(this.shareTimer); }

  runs(text: string): TextRun[] { return emphasis(text); }
  plain(text: string): string { return plainText(text); }
  colorOf(s: Song): string { return songColor(s); }
  seedOf(s: Song): number { return seedOf('song:' + s.id); }

  pick(i: number): void {
    if (this.isCurrent()) this.player.setLine(i);
    else this.localLine.set(i);
  }

  /** Plays within the list it came from: Curtidas if it is one, otherwise its toque. */
  play(): void {
    if (this.isCurrent()) { this.player.toggle(); return; }
    const s = this.song();
    if (!s) return;
    const liked = [...this.firebase.favorites()].filter(id => this.data.songById().has(id));
    const queue = liked.includes(s.id) ? liked : (this.data.songsByToque().get(s.toque[0]) ?? [s]).slice().sort(byTitle).map(o => o.id);
    const start = this.localLine();
    this.player.playSongs(queue, s.id);
    if (start !== null) this.player.setLine(start);
  }

  async toggleLearned(): Promise<void> {
    await this.firebase.waitForAuthReady();
    if (!this.firebase.currentUser()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    try { await this.firebase.toggleLearned(this.id()); } catch { /* the service restores the state */ }
  }

  async share(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.href);
      this.shared.set(true);
      clearTimeout(this.shareTimer);
      this.shareTimer = setTimeout(() => this.shared.set(false), 2000);
    } catch { /* clipboard refused */ }
  }
}
