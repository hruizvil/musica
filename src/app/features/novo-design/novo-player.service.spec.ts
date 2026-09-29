import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { DataService } from '../../core/services/data.service';
import { NovoPlayerService, PlayItem } from './novo-player.service';

/** Stands in for the YouTube player: a clock the test moves, and a record of seeks. */
function fakePlayer() {
  return {
    t: 0, seeks: [] as number[],
    getCurrentTime() { return this.t; }, getDuration() { return 100; },
    seekTo(s: number) { this.t = s; this.seeks.push(s); },
    playVideo() {}, pauseVideo() {}, setPlaybackRate() {}, cueVideoById() {}, loadVideoById() {}, destroy() {},
  };
}

const item = (videoId: string): PlayItem =>
  ({ key: videoId, songId: null, toqueId: null, title: 'T', subtitle: '', color: '#000', videoId, fromToque: false });

/** "Repeat a part" is the classroom feature: mark a start and an end while listening, and it loops. */
describe('NovoPlayerService repeat', () => {
  let svc: NovoPlayerService;
  let yt: ReturnType<typeof fakePlayer>;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: DataService, useValue: { songById: signal(new Map()), toqueById: signal(new Map()), videosByToque: signal(new Map()) } },
      ],
    });
    svc = TestBed.inject(NovoPlayerService);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = svc as any;
    s.start([item('aaaaaaaaaaa'), item('bbbbbbbbbbb')], 0);
    yt = fakePlayer();
    s.player = yt;
    s.onState(1); // playing: starts the ticker
  });

  afterEach(() => { vi.useRealTimers(); TestBed.resetTestingModule(); });

  it('marks a part while listening and jumps back to its start at the end', () => {
    yt.t = 10.4;
    svc.markStart();
    expect(svc.part()).toEqual({ a: 10, b: null });
    expect(svc.repeat()).toBe('part');

    yt.t = 11;
    expect(svc.markEnd()).toBe('too-early');

    yt.t = 20.7;
    expect(svc.markEnd()).toBe('ok');
    expect(svc.part()).toEqual({ a: 10, b: 20 });
    expect(svc.partReady()).toBe(true);
    expect(yt.seeks.at(-1)).toBe(10); // heard straight away

    yt.t = 20.1;
    vi.advanceTimersByTime(250);
    expect(yt.seeks.at(-1)).toBe(10); // looped at the end mark
  });

  it('asks for the start before the end', () => {
    svc.setRepeat('part');
    yt.t = 30;
    expect(svc.markEnd()).toBe('no-start');
  });

  it('repeats the whole video, or the part, when the video ends', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = svc as any;
    svc.setRepeat('all');
    s.onState(0);
    expect(yt.seeks.at(-1)).toBe(0);

    yt.t = 40; svc.markStart();
    s.onState(0);
    expect(yt.seeks.at(-1)).toBe(40);
  });

  it('remembers the part per video, and drops "a part" on a video that has none', () => {
    yt.t = 5; svc.markStart(); yt.t = 9; svc.markEnd();
    svc.next();
    expect(svc.part()).toEqual({ a: null, b: null });
    expect(svc.repeat()).toBe('off');
    svc.prev();
    expect(svc.part()).toEqual({ a: 5, b: 9 });
  });

  it('clears back to no repeat', () => {
    yt.t = 5; svc.markStart(); yt.t = 9; svc.markEnd();
    svc.clearPart();
    expect(svc.repeat()).toBe('off');
    expect(svc.part()).toEqual({ a: null, b: null });
  });

  it('keeps the video on screen (and playing) in mini mode', () => {
    svc.setMini(true);
    expect(svc.videoShown()).toBe(true);
    expect(svc.minimized()).toBe(false);
  });
});
