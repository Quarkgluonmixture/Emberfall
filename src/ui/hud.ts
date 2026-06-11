/** Top bar: date, weather, time controls, save/load, showcase controls, toasts. */
import { BALANCE } from '../config/balance';
import type { Season } from '../core/types';
import { onLangChange, t } from './i18n';
import { iconHtml, seasonIconHtml } from './icons';

export interface HudCallbacks {
  onSpeed: (index: number) => void;
  onSave: () => void;
  onLoad: () => void;
  onNewWorld: () => void;
  onToggleHistory: () => void;
  onToggleAttract: () => void;
  onToggleCinema: () => void;
  onScreenshot: () => void;
  onToggleGallery: () => void;
  onToggleMusic: () => void;
  onOpenMenu: () => void;
}

/** Per speed index: icon file + optional text label beside it. */
const SPEED_BUTTONS: { icon: string; label?: string }[] = [
  { icon: 'ui_pause' },
  { icon: 'ui_play' },
  { icon: 'ui_speed', label: '5×' },
  { icon: 'ui_speed', label: '20×' },
];

interface Labeled {
  btn: HTMLButtonElement;
  text?: () => string;
  title: () => string;
}

export class Hud {
  private dateEl: HTMLElement;
  private weatherEl: HTMLElement;
  private speedButtons: HTMLButtonElement[] = [];
  private musicButton!: HTMLButtonElement;
  private toastEl: HTMLElement;
  private toastTimer = 0;
  private labeled: Labeled[] = [];

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
      const spec = SPEED_BUTTONS[i];
      btn.innerHTML = spec
        ? iconHtml(spec.icon) + (spec.label ? `<span>${spec.label}</span>` : '')
        : `${BALANCE.time.speeds[i]}×`;
      btn.addEventListener('click', () => cb.onSpeed(i));
      root.appendChild(btn);
      this.speedButtons.push(btn);
      this.labeled.push({
        btn,
        title: () =>
          i === 0 ? t('hud.pause.tip') : `${t('hud.speed.tip')} ${BALANCE.time.speeds[i]}× (${i})`,
      });
    });

    const mkButton = (text: (() => string) | null, title: () => string, fn: () => void): HTMLButtonElement => {
      const btn = document.createElement('button');
      btn.addEventListener('click', fn);
      root.appendChild(btn);
      this.labeled.push({ btn, text: text ?? undefined, title });
      return btn;
    };
    const mkIconButton = (icon: string, title: () => string, fn: () => void): HTMLButtonElement => {
      const btn = mkButton(null, title, fn);
      btn.innerHTML = iconHtml(icon);
      return btn;
    };
    mkButton(() => t('hud.attract'), () => t('hud.attract.tip'), cb.onToggleAttract);
    mkButton(() => '🎬', () => t('hud.cinema.tip'), cb.onToggleCinema);
    mkButton(() => '📷', () => t('hud.screenshot.tip'), cb.onScreenshot);
    mkButton(() => t('hud.worlds'), () => t('hud.worlds.tip'), cb.onToggleGallery);
    mkIconButton('ui_save', () => t('hud.save.tip'), cb.onSave);
    mkIconButton('ui_load', () => t('hud.load.tip'), cb.onLoad);
    mkButton(() => t('hud.newWorld'), () => t('hud.newWorld.tip'), cb.onNewWorld);
    mkIconButton('ui_history', () => t('hud.history.tip'), cb.onToggleHistory);
    this.musicButton = mkButton(null, () => t('hud.music.tip'), cb.onToggleMusic);
    this.musicButton.textContent = '🎵';
    mkButton(() => '⚙', () => t('hud.menu.tip'), cb.onOpenMenu);

    this.applyLabels();
    onLangChange(() => this.applyLabels());
    this.toastEl = document.getElementById('toast')!;
  }

  /** Refresh every label/tooltip in the current language. */
  private applyLabels(): void {
    for (const l of this.labeled) {
      if (l.text) l.btn.textContent = l.text();
      l.btn.title = l.title();
    }
  }

  setDate(text: string, season?: Season): void {
    this.dateEl.innerHTML = season === undefined ? text : seasonIconHtml(season) + text;
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

  showToast(message: string): void {
    this.toastEl.textContent = message;
    this.toastEl.classList.remove('hidden');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.add('hidden'), 2600);
  }
}
