import { Component, computed, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { FirebaseService } from '../../core/services/firebase.service';
import { Song } from '../../core/models/song.model';
import { NovoPlayerService } from './novo-player.service';
import { NovoLangService } from './novo-lang.service';
import { NovoSeoService, SITE_ORIGIN } from './novo-seo.service';
import { NovoCoverComponent, NovoIconComponent } from './novo-ui';
import { NovoSongRowComponent, NovoToqueCardComponent } from './novo-parts';
import { LEARNED_COLOR, LIKED_COLOR, PATTERNS, lyricLines, plainText, seedOf, songColor } from './novo-data';

/** Início: pick up where you were, your two lists, the toques by their pattern, what's new. */
@Component({
  selector: 'app-novo-home',
  standalone: true,
  imports: [RouterLink, NovoCoverComponent, NovoIconComponent, NovoSongRowComponent, NovoToqueCardComponent],
  template: `
    <div class="max-w-[1360px] mx-auto px-4 md:px-10 py-5 md:py-8 flex flex-col gap-7 md:gap-9">

      <h1 class="m-0 max-w-3xl n-disp text-[26px] md:text-[40px] font-bold tracking-[-0.04em] leading-[1.05] text-balance">{{ L.s().tagline }}</h1>

      <div class="grid lg:grid-cols-[1.6fr_1fr_1fr] gap-3.5 md:gap-4">
        @if (feature(); as f) {
          <div class="grid grid-cols-[96px_minmax(0,1fr)] md:grid-cols-[168px_minmax(0,1fr)] gap-4 md:gap-6 p-3.5 md:p-5 rounded-[20px] bg-[var(--n-surf)] border border-[var(--n-line)]">
            <app-novo-cover [color]="color(f.song)" [size]="96" [radius]="14" [seed]="seed(f.song)" class="md:hidden" />
            <app-novo-cover [color]="color(f.song)" [title]="f.song.title" [label]="toqueName(f.song)" [size]="168" [radius]="14" [seed]="seed(f.song)" class="hidden md:block" />
            <div class="min-w-0 flex flex-col gap-1.5 md:gap-2.5 justify-center">
              <span class="text-[11px] md:text-xs font-extrabold tracking-[0.1em] uppercase text-[var(--n-acc-tx)]">{{ f.resume ? L.s().resume : L.s().startHere }}</span>
              <a [routerLink]="L.to('/cantigas/' + f.song.id)" class="min-h-10 inline-flex items-center text-xl md:text-[28px] font-extrabold tracking-[-0.02em] leading-tight">{{ f.song.title }}</a>
              @if (f.line; as line) {
                <span class="text-sm md:text-[17px] text-[var(--n-tx)] truncate">“{{ line.pt }}”</span>
                @if (line.en) { <span class="hidden md:block text-[15px] text-[var(--n-tx2)] truncate">{{ plain(line.en) }}</span> }
              }
              <button type="button" (click)="playFeature(f.song)" class="self-start mt-1 h-10 md:h-11 px-4 md:px-[18px] rounded-xl bg-[var(--n-acc)] text-[#1a1400] inline-flex items-center gap-2 text-sm md:text-[15px] font-extrabold">
                <app-novo-icon name="play" [size]="15" />{{ f.resume ? L.s().continue : L.s().play }}
              </button>
            </div>
          </div>
        }

        @for (list of lists(); track list.key) {
          <div class="p-4 md:p-5 rounded-[20px] bg-[var(--n-surf)] border border-[var(--n-line)] flex flex-col gap-2.5">
            <div class="flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-lg flex items-center justify-center text-white" [style.background]="list.color"><app-novo-icon [name]="list.icon" [size]="16" [filled]="list.icon === 'heart'" /></span>
              <a [routerLink]="L.to('/curtidas')" [queryParams]="list.params" class="min-h-10 inline-flex items-center text-[17px] font-extrabold">{{ list.title }}</a>
              <span class="ml-auto text-sm text-[var(--n-tx3)] tabular-nums">{{ list.songs.length }}</span>
            </div>
            @if (!firebase.currentUser() && !firebase.pendingSignedIn()) {
              <p class="m-0 text-sm text-[var(--n-tx2)] leading-relaxed">{{ list.empty }}</p>
              <a [routerLink]="L.to('/login')" [queryParams]="{ returnUrl: L.to('/') }" class="self-start h-10 px-4 rounded-xl border border-[var(--n-line)] inline-flex items-center text-sm font-bold hover:no-underline">{{ L.s().signInGoogle }}</a>
            } @else if (list.songs.length) {
              @for (s of list.songs.slice(0, 3); track s.id) {
                <a [routerLink]="L.to('/cantigas/' + s.id)" class="flex items-center gap-3 py-1.5 border-t border-[var(--n-line)] hover:no-underline">
                  <app-novo-cover [color]="color(s)" [size]="40" [radius]="8" [seed]="seed(s)" />
                  <span class="flex-1 min-w-0 text-[15px] font-bold truncate">{{ s.title }}</span>
                </a>
              }
              <button type="button" (click)="playAll(list.songs)" class="self-start mt-1 h-10 px-3.5 rounded-xl border border-[var(--n-line)] inline-flex items-center gap-2 text-sm font-bold">
                <app-novo-icon name="play" [size]="13" />{{ L.s().playAll }}
              </button>
            } @else {
              <p class="m-0 text-sm text-[var(--n-tx2)] leading-relaxed">{{ list.none }}</p>
            }
          </div>
        }
      </div>

      <section class="flex flex-col gap-4" aria-labelledby="toques-h">
        <div class="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <h2 id="toques-h" class="m-0 n-disp text-2xl md:text-[28px] font-bold tracking-[-0.03em]">{{ L.s().toques }}</h2>
          <span class="hidden sm:inline-flex gap-4 text-[13px] text-[var(--n-tx2)]"><span><b class="text-[var(--n-tx)]">dim</b> {{ L.s().strokeDim }}</span><span><b class="text-[var(--n-tx)]">tch</b> {{ L.s().strokeTch }}</span><span><b class="text-[var(--n-tx)]">dom</b> {{ L.s().strokeDom }}</span></span>
          <a [routerLink]="L.to('/toques')" class="ml-auto min-h-10 inline-flex items-center text-[15px] font-bold text-[var(--n-acc-tx)]">{{ L.s().allToques(data.toques().length) }}</a>
        </div>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          @for (t of featuredToques(); track t.id) { <app-novo-toque-card [toque]="t" /> }
        </div>
      </section>

      <section class="flex flex-col gap-2" aria-labelledby="recent-h">
        <div class="flex items-baseline justify-between mb-1.5">
          <h2 id="recent-h" class="m-0 n-disp text-2xl md:text-[28px] font-bold tracking-[-0.03em]">{{ L.s().recentlyAdded }}</h2>
          <a [routerLink]="L.to('/cantigas')" class="min-h-10 inline-flex items-center text-[15px] font-bold text-[var(--n-acc-tx)]">{{ L.s().all }}</a>
        </div>
        @for (s of recent(); track s.id; let i = $index) {
          <app-novo-song-row [song]="s" [n]="i + 1" [queue]="recentIds()" />
        }
      </section>
    </div>
  `,
})
export class NovoHomeComponent {
  readonly data = inject(DataService);
  readonly firebase = inject(FirebaseService);
  readonly L = inject(NovoLangService);
  private player = inject(NovoPlayerService);
  private seo = inject(NovoSeoService);

  constructor() {
    effect(() => {
      const d = this.L.s();
      this.seo.set({
        description: d.seoHome,
        path: '/',
        jsonLd: {
          '@type': 'WebSite',
          name: d.site,
          url: SITE_ORIGIN + this.L.to('/'),
          inLanguage: d.htmlLang,
          potentialAction: {
            '@type': 'SearchAction',
            target: SITE_ORIGIN + this.L.to('/cantigas') + '?q={search_term_string}',
            'query-input': 'required name=search_term_string',
          },
        },
      });
    });
  }

  private songsFrom(ids: Set<string>): Song[] {
    const byId = this.data.songById();
    return [...ids].map(id => byId.get(id)).filter((s): s is Song => !!s);
  }

  readonly liked = computed(() => this.songsFrom(this.firebase.favorites()));
  readonly learned = computed(() => this.songsFrom(this.firebase.learnedSongs()));

  readonly lists = computed(() => {
    const d = this.L.s();
    return [
      { key: 'c', title: d.liked, icon: 'heart', color: LIKED_COLOR, songs: this.liked(), params: {}, empty: d.likedSignedOut, none: d.likedEmpty },
      { key: 'a', title: d.learned, icon: 'check', color: LEARNED_COLOR, songs: this.learned(), params: { lista: 'aprendidas' }, empty: d.learnedSignedOut, none: d.learnedEmpty },
    ];
  });

  /** What is playing, else the first curtida, else the newest song. Only the first is a real "resume". */
  readonly feature = computed(() => {
    const playing = this.player.currentSong();
    if (playing) return { song: playing, resume: true, line: this.player.currentLine() };
    const song = this.liked()[0] ?? this.recent()[0];
    return song ? { song, resume: false, line: lyricLines(song)[0] ?? null } : null;
  });

  /** Toques with a confirmed pattern first, then the ones with the most songs. */
  readonly featuredToques = computed(() => {
    const count = (id: string) => this.data.songsByToque().get(id)?.length ?? 0;
    return [...this.data.toques()]
      .sort((a, b) => (PATTERNS[b.id] ? 1 : 0) - (PATTERNS[a.id] ? 1 : 0) || count(b.id) - count(a.id))
      .slice(0, 6);
  });

  readonly recent = computed(() => [...this.data.songs()].sort((a, b) => b.dateAdded.localeCompare(a.dateAdded)).slice(0, 5));
  readonly recentIds = computed(() => this.recent().map(s => s.id));

  plain(text: string): string { return plainText(text); }
  color(s: Song): string { return songColor(s); }
  seed(s: Song): number { return seedOf('song:' + s.id); }
  toqueName(s: Song): string { return this.data.toqueById().get(s.toque[0])?.name ?? ''; }

  playFeature(song: Song): void {
    if (this.player.isCurrentSong(song.id)) { this.player.toggle(); return; }
    const inLiked = this.liked().some(s => s.id === song.id);
    this.player.playSongs(inLiked ? this.liked().map(s => s.id) : [song.id], song.id);
  }

  playAll(songs: Song[]): void {
    this.player.playSongs(songs.map(s => s.id));
  }
}
