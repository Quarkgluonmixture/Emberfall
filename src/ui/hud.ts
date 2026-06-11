/** Top bar: date, weather, time controls, save/load, panel toggles, toasts. */
import { BALANCE } from '../config/balance';

export interface HudCallbacks {
  onSpeed: (index: number) => void;
  onSave: () => void;
  onLoad: () => void;
  onNewWorld: () => void;
  onToggleHistory: () => void;
  onToggleDebug: () => void;
}

const SPEED_LABELS = ['⏸', '1×', '5×', '20×'];

export class Hud {
  private dateEl: HTMLElement;
  private weatherEl: HTMLElement;
  private speedButtons: HTMLButtonElement[] = [];
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

    const mkButton = (label: string, title: string, fn: () => void): void => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.title = title;
      btn.addEventListener('click', fn);
      root.appendChild(btn);
    };
    mkButton('Save', 'Save world to browser storage', cb.onSave);
    mkButton('Load', 'Load saved world', cb.onLoad);
    mkButton('New World', 'Generate a fresh world', cb.onNewWorld);
    mkButton('History', 'Toggle the historical record (H)', cb.onToggleHistory);
    mkButton('Debug', 'Toggle debug overlay (F3)', cb.onToggleDebug);

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

  showToast(message: string): void {
    this.toastEl.textContent = message;
    this.toastEl.classList.remove('hidden');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.add('hidden'), 2600);
  }
}
