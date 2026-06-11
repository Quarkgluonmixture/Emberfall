/** Esc settings menu: language, frame-rate cap, debug overlay, music. */
import { getLang, onLangChange, setLang, t } from './i18n';

export interface MenuCallbacks {
  /** Returns the new cap after cycling. */
  onCycleFps: () => number;
  getFpsCap: () => number;
  onToggleDebug: () => void;
  getDebug: () => boolean;
  onToggleMusic: () => void;
  getMusic: () => boolean;
}

export class MenuPanel {
  visible = false;
  private root: HTMLElement;

  constructor(private cb: MenuCallbacks) {
    this.root = document.getElementById('menu')!;
    this.root.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
      if (!el) return;
      e.preventDefault();
      const act = el.dataset.act!;
      if (act === 'lang-en') setLang('en');
      else if (act === 'lang-zh') setLang('zh');
      else if (act === 'fps') this.cb.onCycleFps();
      else if (act === 'debug') this.cb.onToggleDebug();
      else if (act === 'music') this.cb.onToggleMusic();
      else if (act === 'resume') this.toggle(false);
      this.render();
    });
    onLangChange(() => {
      if (this.visible) this.render();
    });
  }

  toggle(force?: boolean): void {
    this.visible = force ?? !this.visible;
    this.root.classList.toggle('hidden', !this.visible);
    if (this.visible) this.render();
  }

  /** Re-render labels (fps cap, toggles) — cheap, called on open and clicks. */
  render(): void {
    const lang = getLang();
    const cap = this.cb.getFpsCap();
    const fpsLabel = cap === 0 ? t('menu.fps.unlimited') : `${cap} FPS`;
    const onOff = (v: boolean): string => (v ? t('menu.on') : t('menu.off'));
    const row = (label: string, act: string, value: string): string =>
      `<div class="menu-row"><span>${label}</span>
        <button data-act="${act}">${value}</button></div>`;
    this.root.innerHTML = `
      <h2>${t('menu.title')}</h2>
      <div class="menu-row"><span>${t('menu.language')}</span>
        <span class="menu-group">
          <button data-act="lang-en" class="${lang === 'en' ? 'active' : ''}">English</button>
          <button data-act="lang-zh" class="${lang === 'zh' ? 'active' : ''}">中文</button>
        </span></div>
      ${row(t('menu.fps'), 'fps', fpsLabel)}
      ${row(t('menu.debug'), 'debug', onOff(this.cb.getDebug()))}
      ${row(t('menu.music'), 'music', onOff(this.cb.getMusic()))}
      <div class="menu-keys"><b>${t('menu.keysTitle')}</b> · ${t('menu.keys')}</div>
      <div class="menu-row menu-resume"><button data-act="resume">${t('menu.resume')} (Esc)</button></div>`;
  }
}
