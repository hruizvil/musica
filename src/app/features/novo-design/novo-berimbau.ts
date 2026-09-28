import { Stroke } from './novo-data';

/**
 * A rough berimbau voice made with Web Audio, so a pattern can be heard on a toque that
 * has no video. It is an approximation and the page says so: dom is the open string, dim
 * a tone higher, and the chiado a short filtered buzz.
 */
export class BerimbauSynth {
  private ctx: AudioContext | null = null;

  /** Must be called from a click: browsers only allow sound after the visitor acts. */
  async wake(): Promise<void> {
    this.ctx ??= new AudioContext();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  strike(stroke: Stroke): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    if (stroke === 'tch') {
      const len = Math.floor(ctx.sampleRate * 0.07);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 1.2;
      const g = ctx.createGain(); g.gain.value = 0.5;
      src.connect(bp).connect(g).connect(ctx.destination);
      src.start(t);
      return;
    }
    const freq = stroke === 'dom' ? 110 : 123.5;
    const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(freq * 1.02, t);
    osc.frequency.exponentialRampToValueAtTime(freq, t + 0.05);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(1800, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.35);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    osc.connect(lp).connect(g).connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.6);
  }

  close(): void {
    void this.ctx?.close();
    this.ctx = null;
  }
}
