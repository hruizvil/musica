import { Component, OnDestroy, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { NovoPlayerService } from './novo-player.service';
import { NovoIconComponent, NovoPatternComponent } from './novo-ui';
import { NovoSongRowComponent } from './novo-parts';
import { BerimbauSynth } from './novo-berimbau';
import { TextRun, byTitle, emphasis, plainText, toqueColor, youTubeId } from './novo-data';
import { NovoLangService } from './novo-lang.service';
import { NovoContentService } from './novo-content.service';
import { NovoSeoService, SITE_ORIGIN } from './novo-seo.service';

const BEAT_MS = 420;

/** A toque: its pattern (heard with the synth or in the video), then its songs. */
@Component({
  selector: 'app-novo-toque',
  standalone: true,
  imports: [RouterLink, NovoIconComponent, NovoPatternComponent, NovoSongRowComponent],
  template: `
    @if (toque(); as t) {
      <section class="bg-[var(--n-surf)] border-b border-[var(--n-line)]">
        <div class="max-w-[1360px] mx-auto px-4 md:px-10 py-6 md:py-10 grid lg:grid-cols-[minmax(0,1fr)_540px] gap-6 lg:gap-10 items-center">
          <div class="flex flex-col gap-3 md:gap-3.5 min-w-0">
            <a [routerLink]="L.to('/toques')" class="self-start inline-flex items-center gap-1 min-h-9 text-sm font-semibold text-[var(--n-tx2)]"><app-novo-icon name="back" [size]="16" />{{ L.s().toques }}</a>
            <span class="self-start px-3 py-1 rounded-full text-white text-xs font-extrabold tracking-[0.1em] uppercase" [style.background]="color()">{{ L.s().toqueLabel }} · {{ category() }}</span>
            <h1 class="m-0 n-disp text-[40px] md:text-[72px] font-bold tracking-[-0.05em] leading-[0.95]">{{ t.name }}</h1>
            <p class="m-0 max-w-[620px] text-base md:text-[17px] leading-relaxed text-[var(--n-tx2)]">@for (r of runs(content.toqueDescription(t)); track $index) {@if (r.em) {<em>{{ r.text }}</em>} @else {{{ r.text }}}}</p>
            <div class="flex flex-wrap gap-2.5 mt-1">
              @if (songs().length) {
                <button type="button" (click)="playSongs()" class="h-12 px-5 rounded-xl bg-[var(--n-acc)] text-[#1a1400] inline-flex items-center gap-2 text-[15px] md:text-base font-extrabold">
                  <app-novo-icon name="play" [size]="16" />{{ L.s().playSongs(songs().length) }}
                </button>
              }
              @if (hasVideo()) {
                <button type="button" (click)="player.playToque(t.id)" class="h-12 px-[18px] rounded-xl border border-[var(--n-line)] inline-flex items-center gap-2 text-[15px] md:text-base font-bold">
                  <app-novo-icon name="video" [size]="18" />{{ L.s().watchToque }}
                </button>
              }
            </div>
          </div>

          <div class="p-4 md:p-6 rounded-[20px] text-white flex flex-col gap-4 md:gap-[18px] min-w-0" [style.background]="color()">
            <div class="flex items-center justify-between gap-3">
              <span class="text-xs md:text-[13px] font-extrabold tracking-[0.1em] uppercase">{{ L.s().patternTitle }}</span>
              @if (hasPattern()) {
                <button type="button" (click)="togglePattern()" [attr.aria-pressed]="patternPlaying()" class="h-10 px-4 rounded-xl bg-white inline-flex items-center gap-2 text-sm font-extrabold" [style.color]="color()">
                  <app-novo-icon [name]="patternPlaying() ? 'pause' : 'play'" [size]="14" />{{ patternPlaying() ? L.s().stop : L.s().hearPattern }}
                </button>
              }
            </div>
            <div class="flex justify-center py-1 md:py-2 overflow-x-auto">
              <app-novo-pattern [toqueId]="t.id" size="m" [onColor]="true" [active]="beat()" class="sm:hidden" />
              <app-novo-pattern [toqueId]="t.id" size="l" [onColor]="true" [active]="beat()" class="hidden sm:inline-flex" />
            </div>
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-[13px] md:text-sm text-white/90">
              <span><b>dim</b> {{ L.s().strokeDim }}</span><span><b>tch</b> {{ L.s().strokeTch }}</span><span><b>dom</b> {{ L.s().strokeDom }}</span>
              <span class="basis-full md:basis-auto md:ml-auto">{{ content.toqueCharacter(t) }}</span>
            </div>
            @if (hasPattern()) {
              <p class="m-0 text-xs text-white/80">{{ L.s().patternSynthNote }}</p>
            }
          </div>
        </div>
      </section>

      <div class="max-w-[1360px] mx-auto px-4 md:px-10 py-6 md:py-8 grid lg:grid-cols-[minmax(0,1fr)_380px] gap-8 lg:gap-10">
        <section class="flex flex-col gap-1.5" aria-labelledby="t-songs">
          <h2 id="t-songs" class="m-0 mb-2 n-disp text-[22px] md:text-[26px] font-bold tracking-[-0.03em]">{{ L.s().songsInToque }}</h2>
          @for (s of songs(); track s.id; let i = $index) {
            <app-novo-song-row [song]="s" [n]="i + 1" [queue]="songIds()" />
          } @empty {
            <p class="m-0 text-[15px] leading-relaxed text-[var(--n-tx2)]">{{ L.s().toqueNoSongs }}{{ hasVideo() ? L.s().toqueNoSongsVideo : '' }}</p>
          }
        </section>
        <aside class="flex flex-col gap-3.5">
          <div class="p-5 rounded-[18px] bg-[var(--n-surf)] border border-[var(--n-line)] flex flex-col gap-2.5">
            <span class="text-[13px] font-extrabold tracking-[0.1em] uppercase text-[var(--n-tx3)]">{{ L.s().whenPlayed }}</span>
            <p class="m-0 text-[15px] leading-relaxed text-[var(--n-tx2)]">@for (r of runs(content.toqueContext(t)); track $index) {@if (r.em) {<em>{{ r.text }}</em>} @else {{{ r.text }}}}</p>
          </div>
          <div class="p-5 rounded-[18px] bg-[var(--n-surf)] border border-[var(--n-line)] flex flex-col gap-2.5">
            <span class="text-[13px] font-extrabold tracking-[0.1em] uppercase text-[var(--n-tx3)]">{{ L.s().instruments }}</span>
            <div class="flex flex-wrap gap-1.5">
              @for (i of content.instruments(t); track $index) { <span class="px-3 py-1.5 rounded-full bg-[var(--n-raise)] text-sm">{{ i }}</span> }
            </div>
          </div>
          @if (related().length) {
            <div class="p-5 rounded-[18px] bg-[var(--n-surf)] border border-[var(--n-line)] flex flex-col gap-2.5">
              <span class="text-[13px] font-extrabold tracking-[0.1em] uppercase text-[var(--n-tx3)]">{{ L.s().relatedToques }}</span>
              <div class="flex flex-wrap gap-2">
                @for (r of related(); track r.id) {
                  <a [routerLink]="L.to('/toques/' + r.id)" class="min-h-10 px-3.5 rounded-xl text-white inline-flex items-center text-sm font-bold hover:no-underline" [style.background]="colorOf(r.id)">{{ r.name }}</a>
                }
              </div>
            </div>
          }
        </aside>
      </div>
    } @else if (data.toques().length) {
      <div class="max-w-md mx-auto px-4 py-20 text-center flex flex-col gap-4 items-center">
        <h1 class="m-0 n-disp text-2xl font-bold">{{ L.s().toqueNotFound }}</h1>
        <a [routerLink]="L.to('/toques')" class="h-11 px-5 rounded-xl bg-[var(--n-acc)] text-[#1a1400] font-extrabold inline-flex items-center hover:no-underline">{{ L.s().seeAllToques }}</a>
      </div>
    }
  `,
})
export class NovoToqueComponent implements OnDestroy {
  readonly data = inject(DataService);
  readonly player = inject(NovoPlayerService);
  readonly content = inject(NovoContentService);
  readonly L = inject(NovoLangService);
  private seo = inject(NovoSeoService);

  id = input.required<string>();

  readonly toque = computed(() => this.data.toqueById().get(this.id()));
  readonly color = computed(() => toqueColor(this.id()));
  readonly category = computed(() => this.content.category(this.toque()?.category ?? 'other'));
  readonly songs = computed(() => [...(this.data.songsByToque().get(this.id()) ?? [])].sort(byTitle));
  readonly songIds = computed(() => this.songs().map(s => s.id));
  readonly hasPattern = computed(() => !!this.data.patterns()[this.id()]);
  readonly hasVideo = computed(() => !!youTubeId(this.data.videosByToque().get(this.id())?.[0]?.youtubeId ?? this.toque()?.videoLinks[0]?.url));
  readonly related = computed(() => (this.toque()?.relatedToques ?? []).map(r => this.data.toqueById().get(r)).filter(t => !!t));

  // ── Hearing the pattern ──
  readonly patternPlaying = signal(false);
  readonly beat = signal<number | null>(null);
  private synth = new BerimbauSynth();
  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    effect(() => {
      const t = this.toque(); const d = this.L.s();
      if (t) {
        this.seo.set({
          title: t.name + ' · ' + d.toques,
          description: d.seoToque(t.name) + ' ' + plainText(this.content.toqueDescription(t)),
          path: '/toques/' + t.id,
          jsonLd: {
            '@type': 'CreativeWork',
            name: t.name,
            description: plainText(this.content.toqueDescription(t)),
            genre: 'Capoeira',
            inLanguage: d.htmlLang,
            url: SITE_ORIGIN + this.L.to('/toques/' + t.id),
          },
        });
      } else if (this.data.toques().length) {
        this.seo.set({ title: d.toqueNotFound, description: d.notFoundBody, path: '/toques/' + this.id(), noindex: true });
      }
    });
    // Moving to another toque stops the pattern that was playing.
    effect(() => { this.id(); this.stopPattern(); });
    // One sound at a time: when the video starts, the synthesised pattern stops.
    effect(() => { if (this.player.playing()) untracked(() => this.stopPattern()); });
  }

  ngOnDestroy(): void {
    this.stopPattern();
    this.synth.close();
  }

  colorOf(id: string): string { return toqueColor(id); }
  runs(text: string): TextRun[] { return emphasis(text); }

  playSongs(): void { this.player.playSongs(this.songIds()); }

  async togglePattern(): Promise<void> {
    if (this.patternPlaying()) { this.stopPattern(); return; }
    const seq = this.data.patterns()[this.id()];
    if (!seq) return;
    // The video would play over the synth; one sound at a time.
    if (this.player.playing()) this.player.toggle();
    await this.synth.wake();
    this.patternPlaying.set(true);
    let i = 0;
    const tick = () => { this.beat.set(i); this.synth.strike(seq[i]); i = (i + 1) % seq.length; };
    tick();
    this.timer = setInterval(tick, BEAT_MS);
  }

  private stopPattern(): void {
    clearInterval(this.timer);
    this.timer = undefined;
    this.patternPlaying.set(false);
    this.beat.set(null);
  }
}
