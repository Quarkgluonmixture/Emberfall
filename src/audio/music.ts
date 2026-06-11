/**
 * Music: seasonal ambience with a night layer and event-driven mood overrides
 * (war, disaster, golden age). Tracks are Suno-generated mp3s shipped in
 * public/assets/music/ (see ASSET_MANIFEST.md); a missing file simply means
 * silence for that slot, the sim itself never depends on audio.
 *
 * Browsers block autoplay until the first user gesture, so playback starts
 * (or resumes) on the first pointer/key input after load.
 */
import { BALANCE } from '../config/balance';
import type { SimState } from '../core/types';

export type MusicTrack =
  | 'theme'
  | 'spring'
  | 'summer'
  | 'autumn'
  | 'winter'
  | 'night'
  | 'war'
  | 'disaster'
  | 'goldenAge';

const FILES: Record<MusicTrack, string> = {
  theme: 'assets/music/theme.mp3',
  spring: 'assets/music/spring.mp3',
  summer: 'assets/music/summer.mp3',
  autumn: 'assets/music/autumn.mp3',
  winter: 'assets/music/winter.mp3',
  night: 'assets/music/night.mp3',
  war: 'assets/music/war.mp3',
  disaster: 'assets/music/disaster.mp3',
  goldenAge: 'assets/music/goldenage.mp3',
};

const SEASON_TRACKS: readonly MusicTrack[] = ['spring', 'summer', 'autumn', 'winter'];

type Mood = 'war' | 'disaster' | 'goldenAge';

/** Higher priority moods interrupt lower ones; equals refresh the timer. */
const MOOD_PRIORITY: Record<Mood, number> = { war: 3, disaster: 2, goldenAge: 1 };

const MOOD_KINDS: Record<string, Mood> = {
  warDeclared: 'war',
  skirmish: 'war',
  capture: 'war',
  famine: 'disaster',
  plague: 'disaster',
  wildfire: 'disaster',
  wildfireWild: 'disaster',
  collapse: 'disaster',
  civFell: 'disaster',
  goldenAge: 'goldenAge',
};

const MUTE_KEY = 'emberfall.musicMuted';

export class MusicManager {
  private players = new Map<MusicTrack, HTMLAudioElement>();
  private failed = new Set<MusicTrack>();
  private current: MusicTrack | null = null;
  private muted: boolean;
  private unlocked = false;
  /** The theme plays once at boot; afterwards the ambience logic takes over. */
  private themeDone = false;
  private mood: Mood | null = null;
  private moodLeft = 0;
  private holdLeft = 0;
  private night = false;
  private chronicleSeen = 0;
  private lastState: SimState | null = null;

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
    if (this.muted) for (const el of this.players.values()) el.pause();
    return this.muted;
  }

  /** Advance fades and re-evaluate which track should be playing. */
  update(dt: number, state: SimState, season: number, darkness: number): void {
    if (state !== this.lastState) {
      // New or loaded world: skip its pre-existing history, drop any mood.
      this.lastState = state;
      this.chronicleSeen = state.chronicle.length;
      this.mood = null;
      this.moodLeft = 0;
    }
    this.scanChronicle(state);

    this.moodLeft -= dt;
    if (this.moodLeft <= 0) this.mood = null;
    this.holdLeft -= dt;

    const a = BALANCE.audio;
    if (!this.night && darkness > a.nightEnter) this.night = true;
    else if (this.night && darkness < a.nightExit) this.night = false;

    const base: MusicTrack = !this.themeDone
      ? 'theme'
      : this.night
        ? 'night'
        : SEASON_TRACKS[season];
    const desired = this.mood ?? base;

    // Event moods cut in immediately; base-layer changes respect the hold so
    // a dusk flicker or fast-forwarded season never thrashes the crossfade.
    if (desired !== this.current && (this.mood !== null || this.holdLeft <= 0)) {
      if (this.current === 'theme') this.themeDone = true;
      this.current = desired;
      this.holdLeft = a.minTrackHoldSeconds;
    }

    this.advanceFades(dt);
  }

  /** Read newly written chronicle entries and derive the strongest mood. */
  private scanChronicle(state: SimState): void {
    const log = state.chronicle;
    if (this.chronicleSeen > log.length) this.chronicleSeen = log.length; // log was compacted
    for (let i = this.chronicleSeen; i < log.length; i++) {
      const entry = log[i];
      if (entry.importance < 2) continue;
      const mood = MOOD_KINDS[entry.kind];
      if (!mood) continue;
      if (this.mood === null || MOOD_PRIORITY[mood] >= MOOD_PRIORITY[this.mood]) {
        this.mood = mood;
        this.moodLeft = BALANCE.audio.moodHoldSeconds[mood];
      }
    }
    this.chronicleSeen = log.length;
  }

  private advanceFades(dt: number): void {
    if (this.muted || !this.unlocked) return;
    const a = BALANCE.audio;
    if (this.current && !this.failed.has(this.current)) {
      const el = this.player(this.current);
      if (el.paused) {
        if (el.ended) {
          // Only the non-looping theme ends; fall through to ambience.
          this.themeDone = true;
        } else {
          void el.play().catch(() => undefined);
        }
      }
    }
    const step = (dt / a.musicFadeSeconds) * a.musicVolume;
    for (const [track, el] of this.players) {
      const target = track === this.current ? a.musicVolume : 0;
      const v =
        el.volume < target ? Math.min(target, el.volume + step) : Math.max(target, el.volume - step);
      el.volume = v;
      if (v === 0 && track !== this.current && !el.paused) el.pause();
    }
  }

  private player(track: MusicTrack): HTMLAudioElement {
    let el = this.players.get(track);
    if (!el) {
      el = new Audio(FILES[track]);
      el.loop = track !== 'theme';
      el.preload = 'auto';
      el.volume = 0;
      el.addEventListener('error', () => this.failed.add(track));
      this.players.set(track, el);
    }
    return el;
  }
}
