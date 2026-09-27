import { Component, OnDestroy, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { FirebaseService } from '../../core/services/firebase.service';
import { YoutubeEmbedComponent } from '../../shared/components/youtube-embed/youtube-embed.component';
import { NovoHeartComponent, NovoIconComponent, NovoStatusComponent, NovoTempoComponent } from './novo-ui';
import { CATEGORY_LABEL, TEMPO_LABEL, byTitle } from './novo-utils';

/**
 * Estúdio toque page: the numbers first (tempo, character, instruments, songs), then the
 * demonstration and a metronome at the toque's own tempo, then its songs.
 */
@Component({
  selector: 'app-novo-toque',
  standalone: true,
  imports: [RouterLink, YoutubeEmbedComponent, NovoHeartComponent, NovoIconComponent, NovoStatusComponent, NovoTempoComponent],
  template: `
    @if (toque(); as t) {
      <div class="hidden md:flex h-16 items-center px-8 bg-white border-b border-[#e3e6eb]">
        <nav aria-label="Trilha" class="text-sm text-[#5f6778]">
          <a routerLink="/novo/toques" class="text-[#5f6778] hover:text-[#0f1115]">Toques</a>
          <span class="mx-1.5 text-[#b3b9c4]">/</span><span class="text-[#0f1115]">{{ t.name }}</span>
        </nav>
      </div>

      <div class="max-w-[1180px] mx-auto px-4 md:px-8 py-6 md:py-8 flex flex-col gap-6">
        <div class="flex flex-col gap-2">
          <p class="n-label m-0">Toque · {{ category() }}</p>
          <h1 class="m-0 text-3xl md:text-[44px] leading-[1.05] font-semibold tracking-[-0.03em]">{{ t.name }}</h1>
          <p class="m-0 max-w-3xl text-[15px] leading-relaxed text-[#434a5a]">{{ t.description }}</p>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="bg-white border border-[#e3e6eb] rounded-[14px] p-4 flex flex-col gap-1.5">
            <p class="n-label m-0">Andamento</p>
            <p class="m-0 text-xl md:text-[26px] font-semibold tracking-[-0.02em]">{{ t.tempoBPM ? t.tempoBPM.min + '–' + t.tempoBPM.max + ' BPM' : 'Variável' }}</p>
            <p class="m-0 text-[13px] text-[#5f6778]">{{ tempoLabel() }}</p>
          </div>
          <div class="bg-white border border-[#e3e6eb] rounded-[14px] p-4 flex flex-col gap-1.5">
            <p class="n-label m-0">Caráter</p>
            <p class="m-0 text-xl md:text-[26px] font-semibold tracking-[-0.02em] capitalize">{{ t.gameCharacter.split(',')[0] }}</p>
            <p class="m-0 text-[13px] text-[#5f6778]">{{ t.gameCharacter }}</p>
          </div>
          <div class="bg-white border border-[#e3e6eb] rounded-[14px] p-4 flex flex-col gap-1.5">
            <p class="n-label m-0">Instrumentos</p>
            <p class="m-0 text-xl md:text-[26px] font-semibold tracking-[-0.02em]">{{ t.instruments.length }}</p>
            <p class="m-0 text-[13px] text-[#5f6778]">{{ t.instruments.join(', ') }}</p>
          </div>
          <div class="bg-white border border-[#e3e6eb] rounded-[14px] p-4 flex flex-col gap-1.5">
            <p class="n-label m-0">Cantigas</p>
            <p class="m-0 text-xl md:text-[26px] font-semibold tracking-[-0.02em]">{{ songs().length }}</p>
            <p class="m-0 text-[13px] text-[#5f6778]">
              @if (firebase.currentUser()) { {{ learnedHere() }} aprendida{{ learnedHere() === 1 ? '' : 's' }} } @else { neste toque }
            </p>
          </div>
        </div>

        <div class="grid lg:grid-cols-[3fr_2fr] gap-5 items-start">
          <div class="bg-white border border-[#e3e6eb] rounded-[14px] p-3.5 flex flex-col gap-3">
            @if (videos().length) {
              @for (v of videos(); track v.id) {
                <app-youtube-embed [videoId]="v.id" [title]="v.title" />
              }
            } @else {
              <div class="aspect-video rounded-[10px] bg-[#f6f7f9] border border-dashed border-[#c9ced8] flex items-center justify-center text-sm text-[#5f6778] text-center px-6">
                Ainda não há demonstração deste toque. Use o metrônomo ao lado para sentir o pulso.
              </div>
            }
          </div>

          <div class="bg-white border border-[#e3e6eb] rounded-[14px] p-4 md:p-5 flex flex-col gap-4">
            @if (t.tempoBPM) {
              <p class="n-label m-0">Pulso do toque</p>
              <div class="grid grid-cols-8 gap-3 items-center justify-items-center" aria-hidden="true">
                @for (b of beats; track b) {
                  <span class="rounded-full transition-colors duration-75"
                    [class]="(b % 4 === 0 ? 'w-5 h-5 ' : 'w-3.5 h-3.5 ') + (playing() && beat() === b ? 'bg-[#2146d8]' : (b % 4 === 0 ? 'bg-[#b9c6f5]' : 'bg-[#dfe4f4]'))"></span>
                }
              </div>
              <div class="flex items-center gap-2">
                <button type="button" (click)="toggleMetronome()" [attr.aria-pressed]="playing()"
                  class="flex-1 h-11 md:h-10 rounded-[10px] text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
                  [class]="playing() ? 'bg-[#0f1115]' : 'bg-[#2146d8]'">
                  <app-novo-icon [name]="playing() ? 'stop' : 'play'" [size]="14" />{{ playing() ? 'Parar' : 'Tocar metrônomo' }}
                </button>
                <button type="button" (click)="nudge(-5)" aria-label="Mais lento" class="w-11 md:w-10 h-11 md:h-10 rounded-[10px] border border-[#e3e6eb] flex items-center justify-center"><app-novo-icon name="minus" [size]="16" /></button>
                <span class="w-[72px] text-center n-mono text-sm" aria-live="polite">{{ bpm() }} BPM</span>
                <button type="button" (click)="nudge(5)" aria-label="Mais rápido" class="w-11 md:w-10 h-11 md:h-10 rounded-[10px] border border-[#e3e6eb] flex items-center justify-center"><app-novo-icon name="plus" [size]="16" /></button>
              </div>
              <p class="m-0 text-[13px] text-[#5f6778]">Começa no meio da faixa do toque ({{ t.tempoBPM.min }}–{{ t.tempoBPM.max }}).</p>
              <div class="h-px bg-[#e3e6eb]"></div>
            }
            <p class="n-label m-0">Contexto do jogo</p>
            <p class="m-0 text-sm leading-relaxed text-[#434a5a]">{{ t.context }}</p>
          </div>
        </div>

        <section class="flex flex-col gap-3" aria-labelledby="cantigas-toque">
          <h2 id="cantigas-toque" class="m-0 text-base font-semibold">Cantigas neste toque</h2>
          @if (songs().length) {
            <ul class="m-0 p-0 list-none bg-white border border-[#e3e6eb] rounded-[14px] overflow-hidden">
              @for (s of songs(); track s.id) {
                <li class="relative flex items-center gap-3 pl-2 pr-3 md:pr-4 py-1.5 border-t first:border-t-0 border-[#e3e6eb]">
                  <span class="relative z-10"><app-novo-heart [songId]="s.id" [title]="s.title" /></span>
                  <a [routerLink]="['/novo/musicas', s.id]" class="flex-1 min-w-0 py-2 text-sm font-semibold text-[#0f1115] hover:text-[#2146d8] after:absolute after:inset-0">{{ s.title }}</a>
                  <span class="hidden sm:inline text-[13px] text-[#5f6778]">{{ otherToques(s.toque) }}</span>
                  <app-novo-status [songId]="s.id" />
                  <a [routerLink]="['/novo/musicas', s.id]" [queryParams]="{ modo: 'praticar' }" class="relative z-10 hidden sm:inline-flex h-9 px-3 rounded-[10px] border border-[#e3e6eb] items-center gap-1.5 text-sm font-semibold text-[#0f1115]"><app-novo-icon name="eye" [size]="15" />Praticar</a>
                </li>
              }
            </ul>
          } @else {
            <p class="m-0 text-sm text-[#5f6778]">Ainda não há cantigas cadastradas para este toque.</p>
          }
        </section>

        @if (related().length) {
          <section class="flex flex-col gap-3" aria-labelledby="relacionados">
            <h2 id="relacionados" class="m-0 text-base font-semibold">Toques relacionados</h2>
            <div class="flex flex-wrap gap-2">
              @for (r of related(); track r.id) {
                <a [routerLink]="['/novo/toques', r.id]" class="min-h-11 md:min-h-10 px-3.5 rounded-[10px] border border-[#e3e6eb] bg-white inline-flex items-center gap-2 text-sm font-semibold text-[#0f1115] hover:border-[#2146d8]">
                  {{ r.name }} <app-novo-tempo [toque]="r" />
                </a>
              }
            </div>
          </section>
        }
      </div>
    } @else if (data.toques().length) {
      <div class="max-w-md mx-auto px-4 py-20 text-center flex flex-col gap-4 items-center">
        <h1 class="m-0 text-2xl font-semibold">Toque não encontrado</h1>
        <a routerLink="/novo/toques" class="h-10 px-4 rounded-[10px] bg-[#2146d8] text-white text-sm font-semibold inline-flex items-center">Ver todos os toques</a>
      </div>
    }
  `,
})
export class NovoToqueComponent implements OnDestroy {
  readonly data = inject(DataService);
  readonly firebase = inject(FirebaseService);
  private titleService = inject(Title);

  id = input.required<string>();

  readonly toque = computed(() => this.data.toqueById().get(this.id()));
  readonly category = computed(() => CATEGORY_LABEL[this.toque()?.category ?? 'other']);
  readonly tempoLabel = computed(() => TEMPO_LABEL[this.toque()?.tempo ?? 'variable']);
  readonly songs = computed(() => [...(this.data.songsByToque().get(this.id()) ?? [])].sort(byTitle));
  readonly learnedHere = computed(() => this.songs().filter(s => this.firebase.learnedSongs().has(s.id)).length);
  readonly related = computed(() => (this.toque()?.relatedToques ?? []).map(id => this.data.toqueById().get(id)).filter(t => !!t));

  readonly videos = computed(() => [
    ...(this.data.videosByToque().get(this.id()) ?? []).map(v => ({ id: v.youtubeId, title: v.title })),
    ...(this.toque()?.videoLinks ?? []).map(v => ({ id: v.url, title: v.label })),
  ]);

  // ── Metronome ──
  readonly beats = Array.from({ length: 16 }, (_, i) => i);
  readonly bpm = linkedSignal(() => {
    const r = this.toque()?.tempoBPM;
    return r ? Math.round((r.min + r.max) / 2) : 90;
  });
  readonly playing = signal(false);
  readonly beat = signal(-1);
  private timer?: ReturnType<typeof setInterval>;
  private audio?: AudioContext;

  constructor() {
    effect(() => {
      const t = this.toque();
      if (t) this.titleService.setTitle(t.name + ' · Toques · Novo design · Abadá Música');
    });
    // Leaving for another toque stops the click; it would otherwise run at the old tempo.
    effect(() => {
      this.id();
      this.stop();
    });
  }

  ngOnDestroy(): void {
    this.stop();
    void this.audio?.close();
  }

  toggleMetronome(): void {
    if (this.playing()) this.stop(); else this.start();
  }

  nudge(delta: number): void {
    this.bpm.set(Math.min(200, Math.max(30, this.bpm() + delta)));
    if (this.playing()) { this.stop(); this.start(); }
  }

  private start(): void {
    this.audio ??= new AudioContext();
    void this.audio.resume();
    this.playing.set(true);
    this.beat.set(-1);
    const tick = () => {
      const next = (this.beat() + 1) % 16;
      this.beat.set(next);
      this.click(next % 4 === 0);
    };
    tick();
    this.timer = setInterval(tick, 60000 / this.bpm());
  }

  private stop(): void {
    clearInterval(this.timer);
    this.timer = undefined;
    this.playing.set(false);
    this.beat.set(-1);
  }

  /** A short blip: higher on the first beat of each group of four. */
  private click(accent: boolean): void {
    const ctx = this.audio;
    if (!ctx) return;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.frequency.value = accent ? 1500 : 1000;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  }

  otherToques(ids: string[]): string {
    return ids.filter(id => id !== this.id()).map(id => this.data.toqueById().get(id)?.name ?? id).join(', ');
  }
}
