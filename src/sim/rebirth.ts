/**
 * Civ rebirth: long after a people falls, a new culture may rise from quiet
 * ruins outside any living civ's territory. All randomness uses the sim RNG.
 */
import { BALANCE } from '../config/balance';
import { CIV_COLORS, CIV_NAMES, CULTURE_TRAITS } from '../config/civConfig';
import type { RNG } from '../core/rng';
import { MAX_CIVS, type Civilization, type RuinSite, type SimState } from '../core/types';
import { pushEvent } from './chronicle';
import { addCivRelations } from './diplomacy';
import { foundSettlement, scoreSite } from './founding';
import { recomputeTerritory } from './territory';

export function maybeRebirth(state: SimState, rng: RNG): void {
  const cfg = BALANCE.rebirth;
  if (state.civs.length >= MAX_CIVS) return;
  const alive = state.civs.filter((c) => c.alive).length;
  if (alive >= BALANCE.civ.count) return;
  if (state.day - state.lastRebirthDay < cfg.cooldownDays) return;
  const quiet = state.ruins.filter((r) => state.day - r.day >= cfg.ruinMinAgeDays);
  if (quiet.length === 0) return;
  if (!rng.chance(cfg.chance)) return;

  // Best unclaimed ruin by current site quality; claimed land goes to migration.
  const w = state.world;
  let best: RuinSite | null = null;
  let bestScore: number = cfg.minSiteScore;
  for (const r of quiet) {
    if (w.owner[r.y * w.width + r.x] !== -1) continue;
    const sc = scoreSite(w, r.x, r.y) * rng.range(0.9, 1.1);
    if (sc > bestScore) {
      bestScore = sc;
      best = r;
    }
  }

  // Near-empty worlds: empires cannot hold every quiet corner. Allow claimed
  // ruins, preferring those remote from any living settlement.
  if (!best && alive <= cfg.frontierAliveMax) {
    bestScore = cfg.minSiteScore;
    for (const r of quiet) {
      const sc = scoreSite(w, r.x, r.y);
      if (sc <= cfg.minSiteScore) continue;
      let nearest = Infinity;
      for (const s of state.settlements) {
        nearest = Math.min(nearest, (s.x - r.x) ** 2 + (s.y - r.y) ** 2);
      }
      const remote = sc * rng.range(0.9, 1.1) + Math.sqrt(nearest) * 0.5;
      if (remote > bestScore) {
        bestScore = remote;
        best = r;
      }
    }
  }
  if (!best) return;

  const used = new Set(state.civs.map((c) => c.name));
  const fresh = CIV_NAMES.filter((n) => !used.has(n));
  const name = fresh.length > 0 ? rng.pick(fresh) : `New ${rng.pick(CIV_NAMES)}`;

  // The new people may keep one memory of the most recently fallen culture.
  const fallen = state.civs
    .filter((c) => !c.alive && c.traits.length > 0)
    .sort((a, b) => b.fallenYear - a.fallenYear)[0];
  let traits = rng.shuffle([...CULTURE_TRAITS]).slice(0, BALANCE.civ.traitCount) as string[];
  if (fallen && rng.chance(cfg.inheritTraitChance)) {
    const inherited = rng.pick(fallen.traits);
    traits = [inherited, ...traits.filter((t) => t !== inherited)].slice(
      0,
      BALANCE.civ.traitCount,
    );
  }

  const civ: Civilization = {
    id: state.civs.length,
    name,
    color: CIV_COLORS[state.civs.length % CIV_COLORS.length],
    alive: true,
    fallenYear: -1,
    foundedDay: state.day,
    traits,
    knowledge: 0,
    faith: 0,
    culture: 0,
    military: cfg.startPopulation * BALANCE.military.perPop,
    goldenAgeDays: 0,
    goldenCooldown: 0,
    crisisDays: 0,
  };
  state.civs.push(civ);
  addCivRelations(state, civ.id, rng);

  const camp = foundSettlement(state, civ.id, best.x, best.y, cfg.startPopulation, rng);
  // A protected beginning: high spirits and no plague through the grace years.
  camp.morale = 85;
  camp.immunityDays = cfg.graceDays;

  // The young culture trades for grain and goodwill with its nearest neighbor —
  // without a partner's caravans, one bad winter ends the story.
  let partner = -1;
  let partnerD2 = Infinity;
  for (const s of state.settlements) {
    if (s.civId === civ.id || !state.civs[s.civId].alive) continue;
    const d2 = (s.x - camp.x) ** 2 + (s.y - camp.y) ** 2;
    if (d2 < partnerD2) {
      partnerD2 = d2;
      partner = s.civId;
    }
  }
  if (partner >= 0) {
    const rel = state.relations[civ.id][partner];
    rel.score = Math.max(rel.score, BALANCE.diplomacy.tradeScore + 5);
    rel.state = 'trade';
    pushEvent(state, rng, 'tradeOpened', 2, civ.id, {
      civ: civ.name,
      otherCiv: state.civs[partner].name,
    });
  }
  state.ruins = state.ruins.filter((r) => r !== best);
  state.lastRebirthDay = state.day;
  pushEvent(state, rng, 'rebirth', 3, civ.id, {
    civ: civ.name,
    name: camp.name,
    x: camp.x,
    y: camp.y,
  });
  recomputeTerritory(state);
}
