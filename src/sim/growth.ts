/** Settlement population dynamics and tier upgrades (camp → village → town). */
import { BALANCE } from '../config/balance';
import { TRAIT_EFFECTS } from '../config/civConfig';
import type { Civilization, Settlement } from '../core/types';

export interface GrowthResult {
  upgraded: 'village' | 'town' | null;
}

export function updateSettlementGrowth(
  s: Settlement,
  civ: Civilization,
  starving: boolean,
): GrowthResult {
  const cfg = BALANCE.growth;
  const cap = cfg.tierPopCap[s.tier];

  if (starving) {
    let rate = cfg.starveRate;
    if (civ.traits.includes('hardy')) rate *= TRAIT_EFFECTS.hardyStarvation;
    s.population -= s.population * rate;
    s.morale -= cfg.starveMoraleLoss;
    s.hungerDays++;
  } else {
    s.hungerDays = 0;
    if (s.food > s.population * 0.5 && s.population < cap) {
      const moraleFactor = 0.5 + s.morale / 200;
      s.population = Math.min(cap, s.population + s.population * cfg.growthRate * moraleFactor);
    }
    if (s.plagueDays === 0 && s.famineDays === 0 && s.morale < cfg.moraleRecoveryCap) {
      s.morale = Math.min(cfg.moraleRecoveryCap, s.morale + cfg.moraleRecovery);
    }
  }
  s.morale = Math.min(100, Math.max(0, s.morale));
  s.population = Math.max(0, s.population);

  let upgraded: GrowthResult['upgraded'] = null;
  if (s.tier === 0 && s.population >= cfg.villagePop && s.wood >= cfg.villageWoodCost) {
    s.wood -= cfg.villageWoodCost;
    s.tier = 1;
    upgraded = 'village';
  } else if (
    s.tier === 1 &&
    s.population >= cfg.townPop &&
    s.stone >= cfg.townStoneCost &&
    s.wood >= cfg.townWoodCost
  ) {
    s.stone -= cfg.townStoneCost;
    s.wood -= cfg.townWoodCost;
    s.tier = 2;
    upgraded = 'town';
  }
  return { upgraded };
}
