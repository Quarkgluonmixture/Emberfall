/** Aggregated settlement economy: production, consumption, civ-level accrual. */
import { BALANCE } from '../config/balance';
import { TERRAIN_DEFS } from '../config/terrainConfig';
import { TRAIT_EFFECTS } from '../config/civConfig';
import { Terrain, type Civilization, type Season, type Settlement, type World } from '../core/types';
import { tilesInRadius } from '../world/world';

export interface GatherYields {
  food: number;
  wood: number;
  stone: number;
}

/** Sum of yield potential of all tiles within the gather radius. */
export function gatherYields(
  world: World,
  x: number,
  y: number,
  radius: number,
  seafaring = false,
): GatherYields {
  let food = 0;
  let wood = 0;
  let stone = 0;
  for (const t of tilesInRadius(world, x, y, radius)) {
    const terr = world.terrain[t.i] as Terrain;
    const def = TERRAIN_DEFS[terr];
    let f = def.food;
    if (seafaring && (terr === Terrain.Coast || terr === Terrain.Ocean)) {
      f *= TRAIT_EFFECTS.seafaringCoastFood;
    }
    food += f;
    wood += def.wood;
    stone += def.stone;
  }
  return { food, wood, stone };
}

export interface ProductionContext {
  season: Season;
  hasTradePartner: boolean;
}

/**
 * One day of production and consumption for a settlement.
 * Returns whether the settlement is starving (consumed more food than it had).
 */
export function updateSettlementResources(
  s: Settlement,
  world: World,
  civ: Civilization,
  ctx: ProductionContext,
): { starving: boolean } {
  const cfg = BALANCE.resources;
  const radius = cfg.gatherRadiusByTier[s.tier] ?? cfg.gatherRadius;
  const y = gatherYields(world, s.x, s.y, radius, civ.traits.includes('seafaring'));

  let prodMult = 1;
  if (civ.traits.includes('industrious')) prodMult *= TRAIT_EFFECTS.industriousProduction;
  if (civ.goldenAgeDays > 0) prodMult *= cfg.goldenAgeProductionBonus;
  if (civ.crisisDays > 0) prodMult *= cfg.crisisProductionPenalty;
  if (ctx.hasTradePartner) prodMult *= cfg.tradeProductionBonus;

  const farmers = s.population * cfg.farmerShare;
  const lumberjacks = s.population * cfg.lumberShare;
  const miners = s.population * cfg.minerShare;

  const foodGain =
    Math.min(farmers * cfg.farmerRate, y.food * cfg.landFoodCap * cfg.tierFoodMult[s.tier]) *
    cfg.seasonFoodMult[ctx.season] *
    prodMult;
  const woodGain = Math.min(lumberjacks * cfg.lumberRate, y.wood * cfg.landWoodCap) * prodMult;
  const stoneGain = Math.min(miners * cfg.minerRate, y.stone * cfg.landStoneCap) * prodMult;

  s.food = Math.min(cfg.foodStorage[s.tier], s.food + foodGain);
  s.wood = Math.min(cfg.woodStorage[s.tier], s.wood + woodGain);
  s.stone = Math.min(cfg.stoneStorage[s.tier], s.stone + stoneGain);

  s.food -= s.population * cfg.foodPerPopPerDay;
  let starving = false;
  if (s.food < 0) {
    s.food = 0;
    starving = true;
  }
  return { starving };
}

/** Daily civ-wide accrual of knowledge, faith and culture from total population. */
export function accrueCivResources(civ: Civilization, totalPopulation: number): void {
  const cfg = BALANCE.resources;
  let k = cfg.knowledgePerPop;
  let f = cfg.faithPerPop;
  let c = cfg.culturePerPop;
  if (civ.traits.includes('scholarly')) k *= TRAIT_EFFECTS.scholarlyKnowledge;
  if (civ.traits.includes('devout')) f *= TRAIT_EFFECTS.devoutFaith;
  if (civ.traits.includes('proud')) c *= TRAIT_EFFECTS.proudCulture;
  if (civ.goldenAgeDays > 0) {
    k *= 1.4;
    c *= 1.5;
  }
  civ.knowledge += totalPopulation * k;
  civ.faith += totalPopulation * f;
  civ.culture += totalPopulation * c;
}
