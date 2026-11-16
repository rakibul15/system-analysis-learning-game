/**
 * Tiny synthesised sound cues (no audio files, so they work offline).
 * Browsers only allow sound after the player interacts, which every cue here follows.
 */
export type Cue = 'right' | 'wrong' | 'mission' | 'level' | 'tap';

let ctx: AudioContext | null = null;
let enabled = true;
export const setSoundEnabled = (on: boolean) => { enabled = on; };

const NOTES: Record<Cue, [number, number, number][]> = {
  // [frequency Hz, start s, length s]
  right: [[660, 0, 0.09], [990, 0.08, 0.14]],
  wrong: [[220, 0, 0.12], [185, 0.1, 0.18]],
  mission: [[523, 0, 0.08], [659, 0.07, 0.08], [784, 0.14, 0.16]],
  level: [[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.1], [1047, 0.3, 0.3]],
  tap: [[880, 0, 0.03]],
};

export function play(cue: Cue) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const t0 = ctx.currentTime;
    for (const [f, at, len] of NOTES[cue]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = cue === 'wrong' ? 'triangle' : 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + at);
      g.gain.exponentialRampToValueAtTime(0.12, t0 + at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + len);
      o.connect(g).connect(ctx.destination);
      o.start(t0 + at);
      o.stop(t0 + at + len + 0.02);
    }
  } catch {
    /* no audio available: stay silent */
  }
}
