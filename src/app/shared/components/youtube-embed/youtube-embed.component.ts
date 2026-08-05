import {
  Component, ElementRef, OnDestroy, computed, effect, inject, input, linkedSignal,
  signal, untracked, viewChild,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  YT_CUED, YT_ENDED, YT_UNSTARTED, YtPlayer, formatTime, loadYouTubeApi, parseTime,
} from './youtube-api';

const LOOP_KEY = 'capoeira-video-loop';
const START_KEY = 'capoeira-video-start';
const SPEED_KEY = 'capoeira-video-speed';

@Component({
  selector: 'app-youtube-embed',
  standalone: true,
  template: `
    @if (resolvedId()) {
      <div class="relative w-full aspect-video rounded-lg overflow-hidden bg-capoeira-night
                  [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:w-full [&>iframe]:h-full">
        @if (apiFailed()) {
          <!-- API script unavailable: plain embed, loops from 0:00 only. -->
          <iframe
            [src]="fallbackUrl()!"
            class="absolute inset-0 w-full h-full"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            loading="lazy"
            [title]="title()">
          </iframe>
        } @else {
          <div #host class="absolute inset-0 w-full h-full"></div>
        }
      </div>

      @if (showControls()) {
        <div class="no-print mt-2 flex flex-wrap items-center gap-2">

          <!-- Loop switch -->
          <button type="button" role="switch" (click)="toggleLoop()"
            [attr.aria-checked]="loop()"
            [title]="loop() ? 'A música vai repetir sem parar' : 'Repetir a música sem parar'"
            class="inline-flex items-center gap-2.5 px-3 py-2 sm:py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm transition-colors hover:border-capoeira-gold/50">
            <span class="flex items-center gap-1.5 text-xs font-semibold transition-colors"
              [class]="loop() ? 'text-capoeira-brown dark:text-capoeira-gold' : 'text-stone-500 dark:text-stone-400'">
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Repetir sem parar
            </span>
            <span class="relative shrink-0 w-10 h-5 rounded-full transition-colors duration-200"
              [class]="loop() ? 'bg-capoeira-gold' : 'bg-stone-300 dark:bg-stone-700'">
              <span class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200"
                [class]="loop() ? 'translate-x-5' : 'translate-x-0'"></span>
            </span>
          </button>

          <!-- Start time -->
          @if (!apiFailed()) {
            <div class="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 sm:py-0.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
              <span class="text-xs font-semibold text-stone-500 dark:text-stone-400">Início</span>
              <input #startInput type="text" inputmode="numeric"
                [value]="startLabel()" (change)="onStartInput(startInput)"
                aria-label="Tempo de início do loop (m:ss)"
                title="Onde o loop recomeça — 0:00 por padrão"
                class="w-12 py-1.5 bg-transparent text-xs font-semibold text-center text-capoeira-brown dark:text-capoeira-gold rounded-lg outline-none focus:ring-1 focus:ring-capoeira-gold/50" />
              <button type="button" (click)="captureCurrentTime()"
                title="Usar o tempo atual do vídeo como início"
                class="px-2 py-2 sm:py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide text-stone-400 hover:text-capoeira-gold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                Aqui
              </button>
              @if (startSeconds() > 0) {
                <button type="button" (click)="setStart(0)" title="Voltar o início para 0:00"
                  class="w-8 h-8 sm:w-7 sm:h-7 shrink-0 flex items-center justify-center rounded-full text-base leading-none text-stone-300 dark:text-stone-600 hover:text-capoeira-gold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                  ×
                </button>
              }
            </div>

            <!-- Playback speed -->
            <div class="inline-flex items-center gap-1 pl-3 pr-1.5 py-1 sm:py-0.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
              <span class="text-xs font-semibold text-stone-500 dark:text-stone-400 mr-0.5">Velocidade</span>
              @for (rate of speedOptions; track rate) {
                <button type="button" (click)="setSpeed(rate)"
                  [attr.aria-pressed]="speed() === rate"
                  [title]="'Reproduzir a ' + rate + 'x'"
                  class="min-w-[34px] px-2 py-2 sm:py-1.5 rounded-lg text-[11px] font-bold transition-colors"
                  [class]="speed() === rate
                    ? 'bg-capoeira-gold/10 text-capoeira-brown dark:text-capoeira-gold'
                    : 'text-stone-400 hover:text-capoeira-gold hover:bg-stone-50 dark:hover:bg-stone-800'">
                  {{ rate }}×
                </button>
              }
            </div>
          }
        </div>
      }
    } @else {
      <div class="w-full aspect-video rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 text-sm">
        Vídeo não disponível
      </div>
    }
  `,
})
export class YoutubeEmbedComponent implements OnDestroy {
  private sanitizer = inject(DomSanitizer);

  videoId = input.required<string>();
  title = input<string>('YouTube video');
  showControls = input<boolean>(true);

  private readonly host = viewChild<ElementRef<HTMLElement>>('host');
  private player: YtPlayer | null = null;
  private loadedId: string | null = null;

  readonly apiFailed = signal(false);
  readonly loop = signal<boolean>(this.storedLoop());
  readonly resolvedId = computed(() => this.extractId(this.videoId()));

  /** Playback rate, remembered globally like the loop switch. */
  readonly speedOptions: readonly number[] = [1, 0.75, 0.5];
  readonly speed = signal<number>(this.storedSpeed());

  /** Start point of every repeat, remembered per video. */
  readonly startSeconds = linkedSignal<string | null, number>({
    source: () => this.resolvedId(),
    computation: (id) => (id ? this.storedStart(id) : 0),
  });
  readonly startLabel = computed(() => formatTime(this.startSeconds()));

  readonly fallbackUrl = computed((): SafeResourceUrl | null => {
    const id = this.resolvedId();
    if (!id) return null;
    const params = ['rel=0', 'modestbranding=1'];
    if (this.startSeconds() > 0) params.push(`start=${this.startSeconds()}`);
    // A single video only loops when it is also declared as a one-item playlist.
    if (this.loop()) params.push('loop=1', `playlist=${id}`);
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${id}?${params.join('&')}`,
    );
  });

  constructor() {
    // Build the player once the host div is in the DOM.
    effect(() => {
      const el = this.host()?.nativeElement;
      const id = this.resolvedId();
      if (!el || !id || this.player || this.apiFailed()) return;
      const start = untracked(this.startSeconds);
      loadYouTubeApi().then((YT) => {
        if (!el.isConnected || this.player) return;
        this.player = new YT.Player(el, {
          videoId: id,
          playerVars: {
            rel: 0, modestbranding: 1, playsinline: 1, start, origin: location.origin,
          },
          events: {
            // cueVideoById below resets the rate to 1x, same as a fresh player does.
            onReady: () => this.player?.setPlaybackRate(this.speed()),
            onStateChange: (event) => this.onStateChange(event.data),
          },
        });
        this.loadedId = id;
      }).catch(() => this.apiFailed.set(true));
    });

    // Swap songs without tearing the player down.
    effect(() => {
      const id = this.resolvedId();
      if (!this.player || !id || id === this.loadedId) return;
      this.loadedId = id;
      this.player.cueVideoById({ videoId: id, startSeconds: untracked(this.startSeconds) });
      // cueVideoById drops any previously chosen rate back to 1x — reapply it.
      this.player.setPlaybackRate(untracked(this.speed));
    });

    // A new start time applies immediately while nothing is playing yet; mid-playback it
    // takes effect on the next repeat so the toggle never interrupts the song.
    effect(() => {
      const start = this.startSeconds();
      const id = this.loadedId;
      if (!this.player || !id) return;
      const state = this.player.getPlayerState();
      if (state === YT_UNSTARTED || state === YT_CUED) {
        this.player.cueVideoById({ videoId: id, startSeconds: start });
        this.player.setPlaybackRate(untracked(this.speed));
      }
    });
  }

  ngOnDestroy(): void {
    this.player?.destroy();
    this.player = null;
  }

  toggleLoop(): void {
    const next = !this.loop();
    this.loop.set(next);
    this.write(LOOP_KEY, next ? '1' : '0');
  }

  setStart(seconds: number): void {
    const duration = Math.floor(this.player?.getDuration() ?? 0);
    const max = duration > 1 ? duration - 1 : Number.MAX_SAFE_INTEGER;
    const clamped = Math.max(0, Math.min(Math.floor(seconds), max));
    this.startSeconds.set(clamped);
    const id = this.resolvedId();
    if (id) this.write(`${START_KEY}:${id}`, String(clamped));
  }

  onStartInput(element: HTMLInputElement): void {
    this.setStart(parseTime(element.value) ?? this.startSeconds());
    // The [value] binding won't fire when the parsed result equals the current value
    // (bad input, or a clamped one), so normalise what the field shows by hand.
    element.value = this.startLabel();
  }

  captureCurrentTime(): void {
    if (this.player) this.setStart(this.player.getCurrentTime());
  }

  setSpeed(rate: number): void {
    this.speed.set(rate);
    this.write(SPEED_KEY, String(rate));
    this.player?.setPlaybackRate(rate);
  }

  private onStateChange(state: number): void {
    if (state !== YT_ENDED || !this.loop() || !this.player) return;
    // seekTo/playVideo don't touch the rate (only cueing a video does), but reapply it
    // anyway so a loop restart can never be seen to fall back to 1x.
    this.player.setPlaybackRate(this.speed());
    this.player.seekTo(this.startSeconds(), true);
    this.player.playVideo();
  }

  private storedLoop(): boolean {
    try {
      return localStorage.getItem(LOOP_KEY) === '1';
    } catch {
      return false;
    }
  }

  private storedSpeed(): number {
    try {
      const stored = Number(localStorage.getItem(SPEED_KEY));
      return stored === 0.75 || stored === 0.5 ? stored : 1;
    } catch {
      return 1;
    }
  }

  private storedStart(id: string): number {
    try {
      const stored = Number(localStorage.getItem(`${START_KEY}:${id}`));
      return Number.isFinite(stored) && stored > 0 ? Math.floor(stored) : 0;
    } catch {
      return 0;
    }
  }

  private write(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // storage unavailable (private mode) — the controls still work for this session
    }
  }

  private extractId(input: string): string | null {
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
    // shorts/ and live/ matter as much as watch?v= — a phone shares a vertical clip
    // as a Shorts link, and without them the id never parses.
    const match = input.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }
}
