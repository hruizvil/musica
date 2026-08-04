/**
 * Minimal loader/typings for the YouTube IFrame Player API.
 *
 * The API is needed because the `loop=1&playlist=<id>` URL trick always restarts
 * a repeat at 0:00 — a start time that survives every repeat requires listening
 * for the ENDED state and seeking back by hand.
 */

export const YT_ENDED = 0;
export const YT_UNSTARTED = -1;
export const YT_CUED = 5;

export interface YtPlayer {
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  cueVideoById(options: { videoId: string; startSeconds?: number }): void;
  destroy(): void;
}

export interface YtNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      playerVars?: Record<string, string | number>;
      events?: { onStateChange?: (event: { data: number }) => void };
    },
  ) => YtPlayer;
}

declare global {
  interface Window {
    YT?: YtNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let pending: Promise<YtNamespace> | null = null;

/** Loads the API script once per page and resolves when the namespace is ready. */
export function loadYouTubeApi(): Promise<YtNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!pending) {
    pending = new Promise<YtNamespace>((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve(window.YT!);
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => {
        pending = null;
        reject(new Error('YouTube IFrame API failed to load'));
      };
      document.head.appendChild(script);
    });
  }
  return pending;
}

/** Seconds → `m:ss`. */
export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, '0')}`;
}

/** `m:ss`, `mm:ss` or a plain second count → seconds, or null when unparseable. */
export function parseTime(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const colon = trimmed.match(/^(\d{1,3}):([0-5]?\d)$/);
  if (colon) return Number(colon[1]) * 60 + Number(colon[2]);
  if (/^\d{1,5}$/.test(trimmed)) return Number(trimmed);
  return null;
}
