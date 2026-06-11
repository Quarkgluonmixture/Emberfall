/** World Story overlay: one elegant line about where the world stands now. */
import type { SimState } from '../core/types';
import { dateText, entryText, getLang, t } from './i18n';

export class WorldStory {
  visible = false;
  private root: HTMLElement;

  constructor() {
    this.root = document.getElementById('worldstory')!;
  }

  toggle(force?: boolean): void {
    this.visible = force ?? !this.visible;
    this.root.classList.toggle('hidden', !this.visible);
  }

  update(state: SimState, shotLabel: string | null): void {
    if (!this.visible) return;

    const pops = new Map<number, number>();
    for (const s of state.settlements) {
      pops.set(s.civId, (pops.get(s.civId) ?? 0) + s.population);
    }
    let domId = -1;
    let domPop = 0;
    for (const [id, p] of pops) {
      if (p > domPop) {
        domPop = p;
        domId = id;
      }
    }
    const dom = state.civs[domId];
    const domColor = dom ? `#${dom.color.toString(16).padStart(6, '0')}` : 'inherit';

    const crises: string[] = [];
    let wars = 0;
    for (let i = 0; i < state.civs.length; i++) {
      for (let j = i + 1; j < state.civs.length; j++) {
        if (!state.civs[i].alive || !state.civs[j].alive) continue;
        if (state.relations[i]?.[j]?.state === 'war') wars++;
      }
    }
    const zh = getLang() === 'zh';
    if (wars > 0) {
      crises.push(zh ? `⚔ ${wars} ${t('story.wars')}` : `⚔ ${wars} war${wars > 1 ? 's' : ''}`);
    }
    const plagues = state.settlements.filter((s) => s.plagueDays > 0).length;
    if (plagues > 0) {
      crises.push(
        zh
          ? `☠ ${plagues} ${t('story.plagueIn')}`
          : `☠ plague in ${plagues} place${plagues > 1 ? 's' : ''}`,
      );
    }
    const famines = state.settlements.filter((s) => s.famineDays > 0).length;
    if (famines > 0) {
      crises.push(zh ? `🥣 ${famines} ${t('story.famineIn')}` : `🥣 famine in ${famines}`);
    }
    for (const civ of state.civs) {
      if (civ.alive && civ.goldenAgeDays > 0) {
        crises.push(zh ? `✨ ${civ.name}${t('story.goldenAgeOf')}` : `✨ golden age of ${civ.name}`);
      }
    }

    let latest = null;
    for (let i = state.chronicle.length - 1; i >= 0; i--) {
      if (state.chronicle[i].importance >= 2) {
        latest = state.chronicle[i];
        break;
      }
    }

    const line2 = shotLabel ?? (latest ? entryText(latest) : '');
    this.root.innerHTML =
      `<div class="ws-line1">${dateText(state.day)}` +
      (dom ? ` · ${t('story.ageOf')} <span style="color:${domColor}">${dom.name}</span>` : '') +
      ` · ${crises.length > 0 ? crises.join(' · ') : t('story.uneasyPeace')}</div>` +
      (line2 ? `<div class="ws-line2">${line2}</div>` : '');
  }
}
