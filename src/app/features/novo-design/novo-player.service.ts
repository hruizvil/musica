import { Injectable, computed, inject, signal } from '@angular/core';
import { DataService } from '../../core/services/data.service';
import { Song } from '../../core/models/song.model';
import { YtPlayer, YT_ENDED, loadYouTubeApi } from '../../shared/components/youtube-embed/youtube-api';
import { NovoLangService } from './novo-lang.service';
import { LyricLine, lyricLines, songColor, toqueColor, youTubeId } from './novo-data';

/** The few player calls this design needs beyond the site's shared typings. */
interface YtFull extends YtPlayer {
  pauseVideo(): void;
  loadVideoById(options: { videoId: string; startSeconds?: number }): void;
}

const YT_PLAYING = 1;
const YT_PAUSED = 2;
const RATE_KEY = 'novo-rate';
/** A song's chosen part, remembered per video on this device. */
const PART_KEY = 'novo-part-';

export type RepeatMode = 'off' | 'all' | 'part';
export interface RepeatPart { a: number | null; b: number | null; }

export interface PlayItem {
  key: string;
  songId: string | null;
  toqueId: string | null;
  title: string;
  subtitle: string;
  color: string;
  videoId: string | null;
  /** True when a song has no recording of its own and its toque's demonstration plays instead. */
  fromToque: boolean;
}

/**
 * One player for the whole new design. It lives in the shell, so moving between pages
 * never stops the music.
 *
 * YouTube requires the video to stay visible (at least 200×200) while it plays, so the
 * shell always shows it while something is playing, and minimising it pauses.
 *
 * There is no timing data for the lyrics, so "the current line" is the one the student
 * picked (tapped, or stepped to), never a guess synced to the audio.
 */
@Injectable({ providedIn: 'root' })
export class NovoPlayerService {
  private data = inject(DataService);
  private lang = inject(NovoLangService);

  readonly queue = signal<PlayItem[]>([]);
  readonly index = signal(0);
  readonly playing = signal(false);
  /** Off, the whole video, or a part of it (from `part.a` to `part.b`). */
  readonly repeat = signal<RepeatMode>('off');
  readonly part = signal<RepeatPart>({ a: null, b: null });
  /** Kept for the controls that only need on/off. */
  readonly loop = computed(() => this.repeat() !== 'off');
  readonly partReady = computed(() => this.repeat() === 'part' && this.part().a !== null && this.part().b !== null);
  /** The small 200×200 video (YouTube's minimum). Still visible, so it keeps playing. */
  readonly mini = signal(false);
  /** Seconds into the current video, and its length. Read from the player while it plays. */
  readonly time = signal(0);
  readonly duration = signal(0);
  readonly rate = signal<number>(this.storedRate());
  readonly line = signal(0);
  readonly minimized = signal(false);
  /** Tucked against a screen edge (a small tab stays). Tucked means hidden, so it pauses; "resume" says whether to play again on return. */
  readonly tucked = signal<{ side: 'left' | 'right'; y: number; resume: boolean } | null>(null);
  readonly apiFailed = signal(false);
  /** How far through the current video, 0 to 1. Read from the player while it plays. */
  readonly progress = signal(0);

  readonly current = computed<PlayItem | null>(() => this.queue()[this.index()] ?? null);
  readonly currentSong = computed<Song | null>(() => {
    const id = this.current()?.songId;
    return id ? this.data.songById().get(id) ?? null : null;
  });
  readonly lines = computed<LyricLine[]>(() => (this.currentSong() ? lyricLines(this.currentSong()!) : []));
  /** Whether the video card is on screen: something with a video is loaded and not minimised. */
  readonly videoShown = computed(() => !!this.current()?.videoId && !this.minimized());
  readonly currentLine = computed<LyricLine | null>(() => this.lines()[this.line()] ?? null);
  readonly previousLine = computed<LyricLine | null>(() => this.lines()[this.line() - 1] ?? null);
  readonly hasPrev = computed(() => this.index() > 0);
  readonly hasNext = computed(() => this.index() < this.queue().length - 1);

  private player: YtFull | null = null;
  private host: HTMLElement | null = null;
  private loadedId: string | null = null;
  private wantPlay = false;
  /** Set when a new item starts, so the same video (a toque demo shared by two songs) plays again from the top. */
  private restart = false;
  private ticker?: ReturnType<typeof setInterval>;

  // ── Starting playback ──

  /** Plays a list of songs, starting from one of them. */
  playSongs(ids: string[], startId?: string): void {
    const items = ids.map(id => this.data.songById().get(id)).filter((s): s is Song => !!s).map(s => this.songItem(s));
    if (!items.length) return;
    const start = Math.max(0, startId ? items.findIndex(i => i.songId === startId) : 0);
    this.start(items, start);
  }

  /** Plays a toque's demonstration video. */
  playToque(toqueId: string): void {
    const t = this.data.toqueById().get(toqueId);
    const video = this.data.videosByToque().get(toqueId)?.[0];
    const videoId = youTubeId(video?.youtubeId ?? t?.videoLinks[0]?.url);
    if (!t) return;
    this.start([{
      key: 'toque:' + toqueId, songId: null, toqueId, title: t.name, subtitle: this.lang.s().toqueDemo,
      color: toqueColor(toqueId), videoId, fromToque: false,
    }], 0);
  }

  isCurrentSong(id: string): boolean {
    return this.current()?.songId === id;
  }

  // ── Controls ──

  toggle(): void {
    if (!this.current()) return;
    if (this.minimized()) this.minimized.set(false);
    if (this.playing()) { this.player?.pauseVideo(); this.wantPlay = false; }
    else { this.wantPlay = true; this.sync(); this.player?.playVideo(); }
  }

  next(): void { if (this.hasNext()) this.go(this.index() + 1); }
  prev(): void { if (this.hasPrev()) this.go(this.index() - 1); }

  setRate(rate: number): void {
    this.rate.set(rate);
    try { localStorage.setItem(RATE_KEY, String(rate)); } catch { /* ignore */ }
    this.player?.setPlaybackRate(rate);
  }

  cycleRate(): void {
    const order = [1, 0.75, 0.5];
    this.setRate(order[(order.indexOf(this.rate()) + 1) % order.length]);
  }

  toggleLoop(): void { this.setRepeat(this.repeat() === 'off' ? 'all' : 'off'); }

  setRepeat(mode: RepeatMode): void { this.repeat.set(mode); }

  /** "Start here": the part starts at the moment the student heard it. */
  markStart(): void {
    const t = Math.floor(this.now());
    const b = this.part().b;
    this.setPart({ a: t, b: b !== null && b > t + 1 ? b : null });
    this.repeat.set('part');
  }

  /** "End here": closes the part and jumps back to its start, so the repeat is heard straight away. */
  markEnd(): 'ok' | 'no-start' | 'too-early' {
    const a = this.part().a;
    if (a === null) return 'no-start';
    const t = Math.floor(this.now());
    if (t <= a + 1) return 'too-early';
    this.setPart({ a, b: t });
    this.repeat.set('part');
    this.player?.seekTo(a, true);
    return 'ok';
  }

  clearPart(): void {
    this.setPart({ a: null, b: null });
    this.repeat.set('off');
  }

  setMini(on: boolean): void { this.mini.set(on); }

  private now(): number { return this.player?.getCurrentTime() ?? this.time(); }

  private setPart(p: RepeatPart): void {
    this.part.set(p);
    const id = this.current()?.videoId;
    if (!id) return;
    try {
      if (p.a === null && p.b === null) localStorage.removeItem(PART_KEY + id);
      else localStorage.setItem(PART_KEY + id, JSON.stringify(p));
    } catch { /* storage blocked: still works for this visit */ }
  }

  /** The part saved for this video, if any. Repeat "a part" only carries over to a video that has one. */
  private loadPart(): void {
    let p: RepeatPart = { a: null, b: null };
    const id = this.current()?.videoId;
    try {
      const raw = id ? localStorage.getItem(PART_KEY + id) : null;
      if (raw) { const v = JSON.parse(raw) as RepeatPart; if (typeof v.a === 'number') p = { a: v.a, b: typeof v.b === 'number' ? v.b : null }; }
    } catch { /* ignore */ }
    this.part.set(p);
    if (this.repeat() === 'part' && (p.a === null || p.b === null)) this.repeat.set('off');
  }

  setLine(i: number): void {
    const n = this.lines().length;
    if (n) this.line.set(Math.min(n - 1, Math.max(0, i)));
  }
  stepLine(delta: number): void { this.setLine(this.line() + delta); }

  /** Hides the video. YouTube may not play while hidden, so this pauses too. */
  minimize(): void {
    this.player?.pauseVideo();
    this.wantPlay = false;
    this.minimized.set(true);
  }
  restore(): void { this.minimized.set(false); this.tucked.set(null); }

  /** Slides the video to a screen edge. YouTube may not play while hidden, so it pauses and remembers whether to resume. */
  tuck(side: 'left' | 'right', y: number): void {
    const resume = this.playing();
    this.minimize();
    this.tucked.set({ side, y, resume });
  }

  /** Brings a tucked video back and, if it was playing, carries on. */
  untuck(): void {
    const t = this.tucked();
    this.tucked.set(null);
    this.minimized.set(false);
    if (t?.resume) { this.wantPlay = true; this.sync(); this.player?.playVideo(); }
  }

  close(): void {
    this.player?.pauseVideo();
    this.wantPlay = false;
    this.queue.set([]);
    this.index.set(0);
    this.playing.set(false);
    this.tucked.set(null);
  }

  // ── The YouTube player (owned by the shell's dock) ──

  /** Called by the dock with the element the player should live in. */
  attach(el: HTMLElement): void {
    this.host = el;
    this.sync();
  }

  detach(): void {
    clearInterval(this.ticker);
    this.player?.destroy();
    this.player = null;
    this.host = null;
    this.loadedId = null;
    this.playing.set(false);
  }

  private start(items: PlayItem[], index: number): void {
    this.queue.set(items);
    this.go(index);
  }

  private go(index: number): void {
    this.index.set(index);
    this.progress.set(0);
    this.time.set(0);
    this.loadPart();
    this.tucked.set(null);
    this.line.set(0);
    this.minimized.set(false);
    this.wantPlay = true;
    this.restart = true;
    this.sync();
  }

  /** Makes the YouTube player show the current item. */
  private sync(): void {
    const id = this.current()?.videoId ?? null;
    if (!id) {
      this.player?.pauseVideo();
      this.playing.set(false);
      return;
    }
    if (!this.host) return;
    if (this.player) {
      if (this.loadedId !== id) {
        this.loadedId = id;
        if (this.wantPlay) this.player.loadVideoById({ videoId: id });
        else this.player.cueVideoById({ videoId: id });
      } else if (this.restart) {
        // Same video as before: loading it again would do nothing, so start it by hand.
        this.player.seekTo(0, true);
        if (this.wantPlay) this.player.playVideo();
      }
      this.restart = false;
      return;
    }
    const host = this.host;
    this.restart = false;
    loadYouTubeApi().then(YT => {
      if (this.player || host !== this.host || !host.isConnected) return;
      this.loadedId = id;
      this.player = new YT.Player(host, {
        videoId: id,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, autoplay: this.wantPlay ? 1 : 0, origin: location.origin },
        events: {
          onReady: () => {
            this.player?.setPlaybackRate(this.rate());
            if (this.wantPlay) this.player?.playVideo();
            // The item may have changed while the API loaded.
            if (this.current()?.videoId && this.current()!.videoId !== this.loadedId) this.sync();
          },
          onStateChange: e => this.onState(e.data),
        },
      }) as YtFull;
    }).catch(() => this.apiFailed.set(true));
  }

  private onState(state: number): void {
    if (state === YT_PLAYING) {
      this.playing.set(true);
      this.player?.setPlaybackRate(this.rate());
      clearInterval(this.ticker);
      // A quarter second is fine enough for a part to end where it was marked.
      this.ticker = setInterval(() => {
        const d = this.player?.getDuration() ?? 0;
        const t = this.player?.getCurrentTime() ?? 0;
        this.time.set(t);
        this.duration.set(d);
        this.progress.set(d ? t / d : 0);
        const { a, b } = this.part();
        if (this.repeat() === 'part' && a !== null && b !== null && t >= b) this.player?.seekTo(a, true);
      }, 250);
    } else if (state === YT_PAUSED) {
      this.playing.set(false);
      clearInterval(this.ticker);
    } else if (state === YT_ENDED) {
      const a = this.part().a;
      if (this.repeat() === 'part' && a !== null) { this.player?.seekTo(a, true); this.player?.playVideo(); }
      else if (this.repeat() !== 'off') { this.player?.seekTo(0, true); this.player?.playVideo(); }
      else if (this.hasNext()) this.next();
      else this.playing.set(false);
    }
  }

  private songItem(s: Song): PlayItem {
    const toqueId = s.toque[0] ?? null;
    let videoId = youTubeId(s.audioLinks.youtube);
    let fromToque = false;
    if (!videoId) {
      for (const t of s.toque) {
        const demo = this.data.videosByToque().get(t)?.[0];
        const demoId = youTubeId(demo?.youtubeId);
        if (demoId) { videoId = demoId; fromToque = true; break; }
      }
    }
    return {
      key: 'song:' + s.id, songId: s.id, toqueId, title: s.title,
      subtitle: this.data.toqueById().get(toqueId ?? '')?.name ?? '', color: songColor(s), videoId, fromToque,
    };
  }

  private storedRate(): number {
    try {
      const r = Number(localStorage.getItem(RATE_KEY));
      if (r === 0.5 || r === 0.75 || r === 1) return r;
    } catch { /* ignore */ }
    return 1;
  }
}
