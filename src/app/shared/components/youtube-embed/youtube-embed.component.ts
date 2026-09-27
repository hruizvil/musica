import {
  Component, ElementRef, OnDestroy, computed, effect, inject, input, linkedSignal,
  signal, untracked, viewChild,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  YT_CUED, YT_ENDED, YT_UNSTARTED, YtPlayer, formatTime, loadYouTubeApi, parseTime,
} from './youtube-api';
import { ActionBarComponent, ActionItem } from '../action-bar/action-bar.component';

const LOOP_KEY = 'capoeira-video-loop';
const START_KEY = 'capoeira-video-start';
const SPEED_KEY = 'capoeira-video-speed';

@Component({
  selector: 'app-youtube-embed',
  standalone: true,
  imports: [ActionBarComponent],
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
        <!-- One right-aligned row — the same bar the song page uses — instead of the
             three stacked rows of labelled controls this used to draw, which pushed the
             content below the fold on a phone. Speed and the loop start sit behind the
             clock so the row stays one row. -->
        <div class="no-print mt-2">
          <app-action-bar [actions]="controlActions()" ariaLabel="Controles do vídeo" (triggered)="onControl($event)">
            @if (panelOpen() && !apiFailed()) {
              <button type="button" (click)="panelOpen.set(false)" aria-label="Fechar velocidade"
                class="fixed inset-0 z-40 cursor-default"></button>
              <div class="absolute right-0 top-12 z-50 w-64 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-xl p-3 space-y-3">
                <div>
                  <p class="text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-1.5">Velocidade</p>
                  <div class="flex gap-1.5">
                    @for (rate of speedOptions; track rate) {
                      <button type="button" (click)="setSpeed(rate)"
                        [attr.aria-pressed]="speed() === rate"
                        class="flex-1 h-11 rounded-lg text-xs font-bold transition-colors"
                        [class]="speed() === rate
                          ? 'bg-capoeira-gold/15 text-capoeira-brown dark:text-capoeira-gold'
                          : 'text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800'">
                        {{ rate }}×
                      </button>
                    }
                  </div>
                </div>
                <div>
                  <p class="text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-1.5">Início do loop</p>
                  <div class="flex items-center gap-1.5">
                    <input #startInput type="text" inputmode="numeric"
                      [value]="startLabel()" (change)="onStartInput(startInput)"
                      aria-label="Tempo de início do loop (m:ss)"
                      class="w-16 h-11 bg-transparent border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-semibold text-center text-capoeira-brown dark:text-capoeira-gold outline-none focus:ring-1 focus:ring-capoeira-gold/50" />
                    <button type="button" (click)="captureCurrentTime()"
                      class="h-11 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wide text-stone-500 hover:text-capoeira-gold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                      Aqui
                    </button>
                    @if (startSeconds() > 0) {
                      <button type="button" (click)="setStart(0)" aria-label="Voltar o início para 0:00" title="Voltar o início para 0:00"
                        class="w-11 h-11 shrink-0 flex items-center justify-center rounded-full text-stone-400 hover:text-capoeira-gold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                        ×
                      </button>
                    }
                  </div>
                </div>
              </div>
            }
          </app-action-bar>
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

  /** The speed / loop-start popover behind the clock button. */
  readonly panelOpen = signal(false);

  readonly controlActions = computed<ActionItem[]>(() => {
    const items: ActionItem[] = [{
      id: 'loop', label: 'Repetir sem parar', icon: 'loop',
      active: this.loop(), state: this.loop() ? 'sim' : 'não',
    }];
    // The plain-iframe fallback cannot change speed or start time, so it only loops.
    if (!this.apiFailed()) {
      items.push({
        id: 'speed', label: 'Velocidade e início do loop', icon: 'clock',
        badge: this.speed() + '×',
        active: this.speed() !== 1 || this.startSeconds() > 0,
        state: this.speed() + '× · início ' + this.startLabel(),
      });
    }
    return items;
  });

  onControl(id: string): void {
    if (id === 'loop') this.toggleLoop();
    else if (id === 'speed') this.panelOpen.update(open => !open);
  }

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
