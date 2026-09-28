import { Component, OnDestroy, computed, effect, inject, input, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { NovoPlayerService } from './novo-player.service';
import { NovoIconComponent, NovoPatternComponent } from './novo-ui';
import { NovoSongRowComponent } from './novo-parts';
import { BerimbauSynth } from './novo-berimbau';
import { CATEGORY_LABEL, PATTERNS, byTitle, toqueColor, youTubeId } from './novo-data';

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
            <a routerLink="/novo/toques" class="self-start inline-flex items-center gap-1 min-h-9 text-sm font-semibold text-[var(--n-tx2)]"><app-novo-icon name="back" [size]="16" />Toques</a>
            <span class="self-start px-3 py-1 rounded-full text-white text-xs font-extrabold tracking-[0.1em] uppercase" [style.background]="color()">Toque · {{ category() }}</span>
            <h1 class="m-0 n-disp text-[40px] md:text-[72px] font-bold tracking-[-0.05em] leading-[0.95]">{{ t.name }}</h1>
            <p class="m-0 max-w-[620px] text-base md:text-[17px] leading-relaxed text-[var(--n-tx2)]">{{ t.description }}</p>
            <div class="flex flex-wrap gap-2.5 mt-1">
              @if (songs().length) {
                <button type="button" (click)="playSongs()" class="h-12 px-5 rounded-xl bg-[var(--n-acc)] text-[#1a1400] inline-flex items-center gap-2 text-[15px] md:text-base font-extrabold">
                  <app-novo-icon name="play" [size]="16" />Tocar {{ songs().length === 1 ? 'a cantiga' : 'as ' + songs().length + ' cantigas' }}
                </button>
              }
              @if (hasVideo()) {
                <button type="button" (click)="player.playToque(t.id)" class="h-12 px-[18px] rounded-xl border border-[var(--n-line)] inline-flex items-center gap-2 text-[15px] md:text-base font-bold">
                  <app-novo-icon name="video" [size]="18" />Ver o vídeo do toque
                </button>
              }
            </div>
          </div>

          <div class="p-4 md:p-6 rounded-[20px] text-white flex flex-col gap-4 md:gap-[18px] min-w-0" [style.background]="color()">
            <div class="flex items-center justify-between gap-3">
              <span class="text-xs md:text-[13px] font-extrabold tracking-[0.1em] uppercase">Padrão do berimbau</span>
              @if (hasPattern()) {
                <button type="button" (click)="togglePattern()" [attr.aria-pressed]="patternPlaying()" class="h-10 px-4 rounded-xl bg-white inline-flex items-center gap-2 text-sm font-extrabold" [style.color]="color()">
                  <app-novo-icon [name]="patternPlaying() ? 'pause' : 'play'" [size]="14" />{{ patternPlaying() ? 'Parar' : 'Ouvir o padrão' }}
                </button>
              }
            </div>
            <div class="flex justify-center py-1 md:py-2 overflow-x-auto">
              <app-novo-pattern [toqueId]="t.id" size="m" [onColor]="true" [active]="beat()" class="sm:hidden" />
              <app-novo-pattern [toqueId]="t.id" size="l" [onColor]="true" [active]="beat()" class="hidden sm:inline-flex" />
            </div>
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-[13px] md:text-sm text-white/90">
              <span><b>dim</b> agudo</span><span><b>tch</b> chiado</span><span><b>dom</b> grave</span>
              <span class="basis-full md:basis-auto md:ml-auto">{{ t.gameCharacter }}</span>
            </div>
            @if (hasPattern()) {
              <p class="m-0 text-xs text-white/80">O som do botão é uma aproximação sintetizada. Para o berimbau de verdade, veja o vídeo do toque.</p>
            }
          </div>
        </div>
      </section>

      <div class="max-w-[1360px] mx-auto px-4 md:px-10 py-6 md:py-8 grid lg:grid-cols-[minmax(0,1fr)_380px] gap-8 lg:gap-10">
        <section class="flex flex-col gap-1.5" aria-labelledby="t-songs">
          <h2 id="t-songs" class="m-0 mb-2 n-disp text-[22px] md:text-[26px] font-bold tracking-[-0.03em]">Cantigas neste toque</h2>
          @for (s of songs(); track s.id; let i = $index) {
            <app-novo-song-row [song]="s" [n]="i + 1" [queue]="songIds()" />
          } @empty {
            <p class="m-0 text-[15px] leading-relaxed text-[var(--n-tx2)]">Ainda não há cantigas cadastradas neste toque.{{ hasVideo() ? ' O vídeo e o padrão já ajudam a reconhecê-lo na roda.' : '' }}</p>
          }
        </section>
        <aside class="flex flex-col gap-3.5">
          <div class="p-5 rounded-[18px] bg-[var(--n-surf)] border border-[var(--n-line)] flex flex-col gap-2.5">
            <span class="text-[13px] font-extrabold tracking-[0.1em] uppercase text-[var(--n-tx3)]">Quando se toca</span>
            <p class="m-0 text-[15px] leading-relaxed text-[var(--n-tx2)]">{{ t.context }}</p>
          </div>
          <div class="p-5 rounded-[18px] bg-[var(--n-surf)] border border-[var(--n-line)] flex flex-col gap-2.5">
            <span class="text-[13px] font-extrabold tracking-[0.1em] uppercase text-[var(--n-tx3)]">Instrumentos</span>
            <div class="flex flex-wrap gap-1.5">
              @for (i of t.instruments; track i) { <span class="px-3 py-1.5 rounded-full bg-[var(--n-raise)] text-sm">{{ i }}</span> }
            </div>
          </div>
          @if (related().length) {
            <div class="p-5 rounded-[18px] bg-[var(--n-surf)] border border-[var(--n-line)] flex flex-col gap-2.5">
              <span class="text-[13px] font-extrabold tracking-[0.1em] uppercase text-[var(--n-tx3)]">Toques próximos</span>
              <div class="flex flex-wrap gap-2">
                @for (r of related(); track r.id) {
                  <a [routerLink]="['/novo/toques', r.id]" class="min-h-10 px-3.5 rounded-xl text-white inline-flex items-center text-sm font-bold hover:no-underline" [style.background]="colorOf(r.id)">{{ r.name }}</a>
                }
              </div>
            </div>
          }
        </aside>
      </div>
    } @else if (data.toques().length) {
      <div class="max-w-md mx-auto px-4 py-20 text-center flex flex-col gap-4 items-center">
        <h1 class="m-0 n-disp text-2xl font-bold">Toque não encontrado</h1>
        <a routerLink="/novo/toques" class="h-11 px-5 rounded-xl bg-[var(--n-acc)] text-[#1a1400] font-extrabold inline-flex items-center hover:no-underline">Ver todos os toques</a>
      </div>
    }
  `,
})
export class NovoToqueComponent implements OnDestroy {
  readonly data = inject(DataService);
  readonly player = inject(NovoPlayerService);
  private titleService = inject(Title);

  id = input.required<string>();

  readonly toque = computed(() => this.data.toqueById().get(this.id()));
  readonly color = computed(() => toqueColor(this.id()));
  readonly category = computed(() => CATEGORY_LABEL[this.toque()?.category ?? 'other']);
  readonly songs = computed(() => [...(this.data.songsByToque().get(this.id()) ?? [])].sort(byTitle));
  readonly songIds = computed(() => this.songs().map(s => s.id));
  readonly hasPattern = computed(() => !!PATTERNS[this.id()]);
  readonly hasVideo = computed(() => !!youTubeId(this.data.videosByToque().get(this.id())?.[0]?.youtubeId ?? this.toque()?.videoLinks[0]?.url));
  readonly related = computed(() => (this.toque()?.relatedToques ?? []).map(r => this.data.toqueById().get(r)).filter(t => !!t));

  // ── Hearing the pattern ──
  readonly patternPlaying = signal(false);
  readonly beat = signal<number | null>(null);
  private synth = new BerimbauSynth();
  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    effect(() => {
      const t = this.toque();
      if (t) this.titleService.setTitle(t.name + ' · Toques · Abadá Música');
    });
    // Moving to another toque stops the pattern that was playing.
    effect(() => { this.id(); this.stopPattern(); });
  }

  ngOnDestroy(): void {
    this.stopPattern();
    this.synth.close();
  }

  colorOf(id: string): string { return toqueColor(id); }

  playSongs(): void { this.player.playSongs(this.songIds()); }

  async togglePattern(): Promise<void> {
    if (this.patternPlaying()) { this.stopPattern(); return; }
    const seq = PATTERNS[this.id()];
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
