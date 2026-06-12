/**
 * Event sound effects: short one-shots driven by newly written chronicle
 * entries (bells for growth, horns for war, rumbles for collapse…). Real
 * samples from public/assets/sfx/<sound>.ogg are preferred when present
 * (CC0, see ASSET_MANIFEST.md); every sound also has a WebAudio-synthesized
 * fallback so the game is fully functional with no audio assets at all.
 * Purely observational: the sim never depends on it. Bulk chronicle jumps
 * (loads, probe fast-forwards) are skipped, and per-sound cooldowns keep
 * dense late-game histories from machine-gunning.
 */
import { BALANCE } from '../config/balance';
import type { SimState } from '../core/types';

type SoundName =
  | 'bellLow'
  | 'bell'
  | 'bellChord'
  | 'horn'
  | 'drum'
  | 'rumble'
  | 'rumbleBig'
  | 'chime'
  | 'shimmer'
  | 'sting'
  | 'crackle'
  | 'splash';

/** kind → [sound, cooldown seconds]. Unlisted kinds are silent by design
    (famine/plague-end & co. would drown everything in the late game). */
const KIND_SOUND: Record<string, [SoundName, number]> = {
  founding: ['bellLow', 4],
  village: ['bell', 4],
  town: ['bellChord', 4],
  warDeclared: ['horn', 10],
  skirmish: ['drum', 20],
  capture: ['drum', 8],
  collapse: ['rumble', 12],
  civFell: ['rumbleBig', 5],
  peace: ['chime', 6],
  treatySigned: ['chime', 6],
  goldenAge: ['shimmer', 8],
  rebirth: ['shimmer', 5],
  plague: ['sting', 30],
  schism: ['sting', 30],
  wildfire: ['crackle', 20],
  wildfireWild: ['crackle', 20],
  flood: ['splash', 20],
  resettleRuin: ['bellLow', 8],
};

const MUTE_KEY = 'emberfall.sfxMuted';
/** More new entries than this in one frame = a bulk jump, not live play. */
const BULK_LIMIT = 8;
const MAX_PER_FRAME = 4;

/** Every sound may have a sample at assets/sfx/<name>.ogg; missing = synth. */
const SAMPLE_NAMES: SoundName[] = [
  'bellLow',
  'bell',
  'bellChord',
  'horn',
  'drum',
  'rumble',
  'rumbleBig',
  'chime',
  'shimmer',
  'sting',
  'crackle',
  'splash',
];

export class SfxManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted: boolean;
  private unlocked = false;
  private chronicleSeen = 0;
  private lastState: SimState | null = null;
  private now = 0;
  private lastPlayed = new Map<SoundName, number>();
  private buffers = new Map<SoundName, AudioBuffer>();
  private samplesRequested = false;

  constructor() {
    this.muted = localStorage.getItem(MUTE_KEY) === '1';
    const unlock = (): void => {
      this.unlocked = true;
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  get enabled(): boolean {
    return !this.muted;
  }

  /** Toggle mute; returns the new muted state. */
  toggle(): boolean {
    this.muted = !this.muted;
    localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    return this.muted;
  }

  /** Scan fresh chronicle entries and fire their sounds (throttled). */
  update(
    dt: number,
    state: SimState,
    view: { x0: number; y0: number; x1: number; y1: number },
  ): void {
    this.now += dt;
    if (state !== this.lastState) {
      this.lastState = state;
      this.chronicleSeen = state.chronicle.length;
      return;
    }
    const log = state.chronicle;
    if (this.chronicleSeen > log.length) this.chronicleSeen = log.length; // compacted
    const fresh = log.length - this.chronicleSeen;
    if (fresh <= 0) return;
    const start = this.chronicleSeen;
    this.chronicleSeen = log.length;
    if (fresh > BULK_LIMIT) return; // load / fast-forward: stay silent
    if (this.muted || !this.unlocked) return;

    let played = 0;
    for (let i = start; i < log.length && played < MAX_PER_FRAME; i++) {
      const entry = log[i];
      if (entry.importance < 2) continue;
      const spec = KIND_SOUND[entry.kind];
      if (!spec) continue;
      const [sound, cooldown] = spec;
      const last = this.lastPlayed.get(sound) ?? -Infinity;
      if (this.now - last < cooldown) continue;
      this.lastPlayed.set(sound, this.now);
      // Off-screen events still tell, but from a distance.
      const onScreen =
        entry.x === undefined ||
        (entry.x >= view.x0 && entry.x <= view.x1 && entry.y! >= view.y0 && entry.y! <= view.y1);
      this.play(sound, onScreen ? 1 : 0.45);
      played++;
    }
  }

  // ── Synthesis ──────────────────────────────────────────────────

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = BALANCE.audio.sfxVolume;
      this.master.connect(this.ctx.destination);
    }
    if (!this.samplesRequested) {
      this.samplesRequested = true;
      for (const name of SAMPLE_NAMES) {
        fetch(`assets/sfx/${name}.ogg`)
          .then(async (r) => {
            if (!r.ok) return;
            const raw = await r.arrayBuffer();
            const audio = await this.ctx!.decodeAudioData(raw);
            this.buffers.set(name, audio);
          })
          .catch(() => undefined); // missing file → synth fallback
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Play a loaded sample (with pitch jitter); false = not loaded yet. */
  private sample(name: SoundName, gain: number, rate = 1, when = 0): boolean {
    const buf = this.buffers.get(name);
    if (!buf) return false;
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate * (0.97 + this.rand() * 0.06);
    const env = ctx.createGain();
    env.gain.value = gain;
    src.connect(env);
    env.connect(this.master!);
    src.start(ctx.currentTime + when);
    return true;
  }

  /** Audio-only 0..1 random (xorshift) — never the sim's RNG stream. */
  private rand(): number {
    let s = this.noiseSeed;
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    this.noiseSeed = s;
    return (s >>> 0) / 0xffffffff;
  }

  private play(sound: SoundName, gain: number): void {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime + 0.01;
    switch (sound) {
      case 'bellLow':
        if (this.sample('bellLow', gain * 0.9) || this.sample('bell', gain * 0.9, 0.78)) break;
        this.bell(t, 392, 1.6, gain * 0.8);
        break;
      case 'bell':
        if (this.sample('bell', gain * 0.9)) break;
        this.bell(t, 523, 1.4, gain * 0.8);
        break;
      case 'bellChord':
        if (this.sample('bellChord', gain * 0.85)) break;
        if (this.buffers.has('bell')) {
          // No dedicated chord sample: stagger the single bell up a triad.
          this.sample('bell', gain * 0.7);
          this.sample('bell', gain * 0.6, 1.12, 0.22);
          this.sample('bell', gain * 0.5, 1.26, 0.45);
          break;
        }
        this.bell(t, 523, 1.8, gain * 0.7);
        this.bell(t + 0.22, 659, 1.6, gain * 0.6);
        this.bell(t + 0.45, 784, 2.0, gain * 0.55);
        break;
      case 'horn':
        if (this.sample('horn', gain * 0.85)) break;
        this.tone(t, 'sawtooth', 196, 174, 1.1, gain * 0.5, 900);
        this.tone(t + 0.05, 'sawtooth', 98, 87, 1.15, gain * 0.4, 600);
        break;
      case 'drum':
        if (this.sample('drum', gain * 0.9)) break;
        this.thump(t, 130, 0.25, gain * 0.9);
        this.noise(t, 0.12, gain * 0.25, 2400, 'highpass');
        break;
      case 'rumble':
        if (this.sample('rumble', gain * 0.9)) break;
        this.noise(t, 1.1, gain * 0.55, 220, 'lowpass');
        this.thump(t, 70, 0.7, gain * 0.6);
        break;
      case 'rumbleBig':
        if (this.sample('rumbleBig', gain) || this.sample('rumble', gain, 0.8)) break;
        this.noise(t, 2.2, gain * 0.7, 180, 'lowpass');
        this.thump(t, 55, 1.2, gain * 0.8);
        this.bell(t + 0.9, 311, 2.4, gain * 0.35);
        break;
      case 'chime':
        if (this.sample('chime', gain * 0.8)) break;
        this.bell(t, 784, 1.2, gain * 0.5);
        this.bell(t + 0.18, 988, 1.4, gain * 0.45);
        break;
      case 'shimmer':
        if (this.sample('shimmer', gain * 0.8)) break;
        this.bell(t, 659, 1.2, gain * 0.4);
        this.bell(t + 0.15, 831, 1.2, gain * 0.38);
        this.bell(t + 0.3, 988, 1.4, gain * 0.36);
        this.bell(t + 0.45, 1319, 1.8, gain * 0.34);
        break;
      case 'sting':
        if (this.sample('sting', gain * 0.8)) break;
        this.tone(t, 'sine', 311, 294, 1.6, gain * 0.35, 1200);
        this.tone(t, 'sine', 330, 311, 1.6, gain * 0.3, 1200);
        break;
      case 'crackle':
        if (this.sample('crackle', gain * 0.85)) break;
        this.noise(t, 0.9, gain * 0.4, 1800, 'bandpass');
        this.noise(t + 0.25, 0.6, gain * 0.3, 2600, 'bandpass');
        break;
      case 'splash':
        if (this.sample('splash', gain * 0.85)) break;
        this.noise(t, 0.8, gain * 0.45, 900, 'lowpass');
        this.noise(t + 0.1, 0.5, gain * 0.3, 2000, 'highpass');
        break;
    }
  }

  /** Struck bell: sine fundamental + detuned partial, exponential decay. */
  private bell(t: number, freq: number, dur: number, gain: number): void {
    this.tone(t, 'sine', freq, freq, dur, gain, 0);
    this.tone(t, 'sine', freq * 2.76, freq * 2.74, dur * 0.5, gain * 0.3, 0);
  }

  /** One enveloped oscillator; lpFreq > 0 adds a lowpass (horn warmth). */
  private tone(
    t: number,
    type: OscillatorType,
    f0: number,
    f1: number,
    dur: number,
    gain: number,
    lpFreq: number,
  ): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain, t + 0.04);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    let head: AudioNode = osc;
    if (lpFreq > 0) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = lpFreq;
      head.connect(lp);
      head = lp;
    }
    head.connect(env);
    env.connect(this.master!);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  /** Pitched membrane thump (drum / earth shake). */
  private thump(t: number, f0: number, dur: number, gain: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f0 * 0.4), t + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(env);
    env.connect(this.master!);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  /** Audio-only noise state (xorshift) — never the sim's RNG stream. */
  private noiseSeed = 0x9e3779b9;

  /** Filtered noise burst (rumble, fire, water). */
  private noise(t: number, dur: number, gain: number, freq: number, type: BiquadFilterType): void {
    const ctx = this.ctx!;
    const len = Math.ceil(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let s = this.noiseSeed;
    for (let i = 0; i < len; i++) {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      data[i] = ((s >>> 0) / 0xffffffff) * 2 - 1;
    }
    this.noiseSeed = s;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(env);
    env.connect(this.master!);
    src.start(t);
    src.stop(t + dur + 0.05);
  }
}
