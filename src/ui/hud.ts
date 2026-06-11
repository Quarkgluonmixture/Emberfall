/** Top bar: date, weather, time controls, save/load, showcase controls, toasts. */
import { BALANCE } from '../config/balance';

export interface HudCallbacks {
  onSpeed: (index: number) => void;
  onSave: () => void;
  onLoad: () => void;
  onNewWorld: () => void;
  onToggleHistory: () => void;
  onToggleDebug: () => void;
  onToggleAttract: () => void;
  onToggleCinema: () => void;
  onScreenshot: () => void;
  onToggleGallery: () => void;
  onCycleFps: () => void;
  onToggleMusic: () => void;
}

const SPEED_LABELS = ['⏸', '1×', '5×', '20×'];

export class Hud {
  private dateEl: HTMLElement;
  private weatherEl: HTMLElement;
  private speedButtons: HTMLButtonElement[] = [];
  private fpsButton!: HTMLButtonElement;
  private musicButton!: HTMLButtonElement;
  private toastEl: HTMLElement;
  private toastTimer = 0;

  constructor(cb: HudCallbacks) {
    const root = document.getElementById('topbar')!;
    root.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = 'EMBERFALL';
    root.appendChild(title);

    this.dateEl = document.createElement('div');
    this.dateEl.className = 'date';
    root.appendChild(this.dateEl);

    this.weatherEl = document.createElement('div');
    this.weatherEl.className = 'weather';
    root.appendChild(this.weatherEl);

    const spacer = document.createElement('div');
    spacer.className = 'spacer';
    root.appendChild(spacer);

    BALANCE.time.speeds.forEach((_, i) => {
      const btn = document.createElement('button');
      btn.textContent = SPEED_LABELS[i] ?? `${BALANCE.time.speeds[i]}×`;
      btn.title = i === 0 ? 'Pause (Space)' : `Speed ${BALANCE.time.speeds[i]}× (${i})`;
      btn.addEventListener('click', () => cb.onSpeed(i));
      root.appendChild(btn);
      this.speedButtons.push(btn);
    });

    const mkButton = (label: string, title: string, fn: () => void): HTMLButtonElement => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.title = title;
      btn.addEventListener('click', fn);
      root.appendChild(btn);
      return btn;
    };
    mkButton('Attract', 'Attract mode: an automated cinematic tour (A)', cb.onToggleAttract);
    mkButton('🎬', 'Cinema mode: hide all UI for recording (C)', cb.onToggleCinema);
    mkButton('📷', 'Save a screenshot of the canvas (P)', cb.onScreenshot);
    mkButton('Worlds', 'Seed gallery: curated worlds (G)', cb.onToggleGallery);
    mkButton('Save', 'Save world to browser storage', cb.onSave);
    mkButton('Load', 'Load the most recent save (manual or autosave)', cb.onLoad);
    mkButton('New World', 'Generate a fresh random world', cb.onNewWorld);
    mkButton('History', 'Toggle the historical record (H)', cb.onToggleHistory);
    mkButton('Debug', 'Toggle debug overlay (F3)', cb.onToggleDebug);
    this.musicButton = mkButton('🎵', 'Toggle music (M)', cb.onToggleMusic);
    this.fpsButton = mkButton('60fps', 'Cycle frame-rate cap (kind to GPUs on idle duty)', cb.onCycleFps);

    this.toastEl = document.getElementById('toast')!;
  }

  setDate(text: string): void {
    this.dateEl.textContent = text;
  }

  setWeather(text: string): void {
    this.weatherEl.textContent = text;
  }

  setSpeed(index: number): void {
    this.speedButtons.forEach((b, i) => b.classList.toggle('active', i === index));
  }

  setMusic(on: boolean): void {
    this.musicButton.textContent = on ? '🎵' : '🔇';
  }

  setFpsLabel(cap: number): void {
    this.fpsButton.textContent = cap === 0 ? '∞fps' : `${cap}fps`;
  }

  showToast(message: string): void {
    this.toastEl.textContent = message;
    this.toastEl.classList.remove('hidden');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.add('hidden'), 2600);
  }
}
