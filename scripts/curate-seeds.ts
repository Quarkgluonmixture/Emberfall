/**
 * Seed curation: scan candidate seeds, score them for showcase quality, and
 * regenerate src/config/seedGallery.ts with the best 8 (archetype-diverse).
 * Descriptions emphasize stable geography so they survive balance changes.
 *
 * Run: npx vite-node scripts/curate-seeds.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Terrain } from '../src/core/types';
import { Simulation } from '../src/sim/simulation';
import { generateWorld } from '../src/world/worldgen';

const SCAN_SEEDS = 120;
const PICK = 8;
const MAX_PER_ARCHETYPE = 2;

interface Candidate {
  seed: number;
  score: number;
  archetype: string;
  landFrac: number;
  mountainFrac: number;
  forestFrac: number;
  riverTiles: number;
  desertFrac: number;
  tundraFrac: number;
  swampFrac: number;
  biomes: number;
  civsAlive: number;
  settlements: number;
  towns: number;
  eventKinds: number;
  wars: number;
}

function evaluate(seed: number): Candidate {
  const world = generateWorld(seed);
  const size = world.width * world.height;
  const counts = new Array<number>(9).fill(0);
  for (let i = 0; i < size; i++) counts[world.terrain[i]]++;
  const land = size - counts[Terrain.Ocean];
  const landFrac = land / size;
  const mountainFrac = counts[Terrain.Mountain] / size;
  const forestFrac = counts[Terrain.Forest] / size;
  const desertFrac = counts[Terrain.Desert] / size;
  const tundraFrac = counts[Terrain.Tundra] / size;
  const swampFrac = counts[Terrain.Swamp] / size;
  const riverTiles = counts[Terrain.River];
  const biomes = counts.filter((c) => c > 0).length;

  const sim = Simulation.create(seed);
  sim.advance(1200); // first decade
  const kinds = new Set(sim.state.chronicle.map((e) => e.kind));
  const wars = sim.state.chronicle.filter((e) => e.kind === 'warDeclared').length;
  const civsAlive = sim.state.civs.filter((c) => c.alive).length;
  const settlements = sim.state.settlements.length;
  const towns = sim.state.settlements.filter((s) => s.tier === 2).length;

  let archetype = 'heartlands';
  if (landFrac < 0.4) archetype = 'isles';
  else if (mountainFrac > 0.085) archetype = 'highlands';
  else if (riverTiles > 230) archetype = 'riverlands';
  else if (desertFrac > 0.055) archetype = 'sands';
  else if (tundraFrac > 0.05) archetype = 'north';
  else if (swampFrac > 0.035) archetype = 'fens';
  else if (forestFrac > 0.3) archetype = 'wilds';

  const score =
    biomes * 1.2 +
    civsAlive * 2 +
    Math.min(30, settlements) / 5 +
    kinds.size * 0.6 +
    towns * 0.4 +
    wars * 1.5 +
    (landFrac >= 0.34 && landFrac <= 0.62 ? 3 : 0);

  return {
    seed,
    score,
    archetype,
    landFrac,
    mountainFrac,
    forestFrac,
    riverTiles,
    desertFrac,
    tundraFrac,
    swampFrac,
    biomes,
    civsAlive,
    settlements,
    towns,
    eventKinds: kinds.size,
    wars,
  };
}

const NAMES: Record<string, string[]> = {
  isles: ['The Sundered Isles', 'The Scattered Shores', 'The Tide-Won Lands'],
  highlands: ['The Stonecrown Reaches', 'The High Fastness', 'The Granite Veil'],
  riverlands: ['The Braided Waters', 'The Thousand Fords', 'The Silverthread Vales'],
  sands: ['The Amber Wastes', 'The Sunburnt March', 'The Glass Horizon'],
  north: ['The Pale Frontier', 'The Winterhold Expanse', 'The Frostfell'],
  fens: ['The Drowned Fens', 'The Mistmere Lowlands', 'The Reedsong Marshes'],
  wilds: ['The Deepwood Realm', 'The Verdant Dark', 'The Elderwood'],
  heartlands: ['The Emberfall Heartlands', 'The Long Meadows', 'The Quiet Crowns'],
};

const OPENINGS: Record<string, string> = {
  isles: 'A realm of scattered islands and long sounds',
  highlands: 'A high country of granite peaks and cold passes',
  riverlands: 'Low green country braided with running water',
  sands: 'A sun-worn land where dunes press against the grass',
  north: 'A cold realm where tundra hems the living lands',
  fens: 'A low, wet country of marshes and slow water',
  wilds: 'A realm swallowed by deep, old forest',
  heartlands: 'Broad temperate heartlands beneath gentle hills',
};

function describe(c: Candidate): string {
  const parts: string[] = [OPENINGS[c.archetype]];
  if (c.riverTiles > 260) parts.push('threaded by many rivers');
  else if (c.riverTiles > 140) parts.push('crossed by long rivers');
  if (c.archetype !== 'highlands' && c.mountainFrac > 0.05) {
    parts.push('walled by mountain chains');
  }
  if (c.archetype !== 'wilds' && c.forestFrac > 0.26) parts.push('dark with forest');
  if (c.archetype !== 'sands' && c.desertFrac > 0.04) parts.push('scarred by desert');
  const geography = `${parts.join(', ')}.`;
  const towns =
    c.towns > 60
      ? 'its valleys soon crowd with walled towns'
      : c.towns > 20
        ? 'walled towns rise within a generation'
        : c.towns > 0
          ? 'the first walled towns rise slowly here'
          : 'life here stays small and scattered';
  const wars =
    c.wars > 8
      ? 'and the marches burn with constant war'
      : c.wars > 2
        ? 'and old borders are often contested'
        : c.wars > 0
          ? 'and peace holds, but thinly'
          : 'and the peoples keep a long peace';
  const vitality = `${c.civsAlive === 5 ? 'All five peoples' : `${c.civsAlive} peoples`} endure the first decade; ${towns}, ${wars}.`;
  return `${geography} ${vitality}`;
}

console.log(`Scanning ${SCAN_SEEDS} seeds…`);
const candidates: Candidate[] = [];
for (let seed = 1; seed <= SCAN_SEEDS; seed++) {
  candidates.push(evaluate(seed));
  if (seed % 20 === 0) console.log(`  …${seed}`);
}
candidates.sort((a, b) => b.score - a.score);

const picked: Candidate[] = [];
const archetypeCounts = new Map<string, number>();
const usedNames = new Map<string, number>();
for (const c of candidates) {
  if (picked.length >= PICK) break;
  const count = archetypeCounts.get(c.archetype) ?? 0;
  if (count >= MAX_PER_ARCHETYPE) continue;
  archetypeCounts.set(c.archetype, count + 1);
  picked.push(c);
}

const entries = picked.map((c) => {
  const nameIndex = usedNames.get(c.archetype) ?? 0;
  usedNames.set(c.archetype, nameIndex + 1);
  const name = NAMES[c.archetype][nameIndex % NAMES[c.archetype].length];
  return { seed: c.seed, name, description: describe(c) };
});

const file = `/**
 * Curated world seeds for the gallery screen.
 * GENERATED by \`npx vite-node scripts/curate-seeds.ts\` — edit that script and
 * re-run it rather than hand-editing entries (descriptions emphasize stable
 * geography over simulated history, so they survive balance changes).
 */
export interface SeedInfo {
  seed: number;
  name: string;
  description: string;
}

export const SEED_GALLERY: SeedInfo[] = [
${entries
  .map(
    (e) =>
      `  {\n    seed: ${e.seed},\n    name: ${JSON.stringify(e.name)},\n    description:\n      ${JSON.stringify(e.description)},\n  },`,
  )
  .join('\n')}
];
`;

const proj = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
fs.writeFileSync(path.join(proj, 'src', 'config', 'seedGallery.ts'), file);
console.log('\nPicked:');
for (const c of picked) {
  console.log(
    `  seed ${String(c.seed).padStart(3)} [${c.archetype.padEnd(10)}] score ${c.score.toFixed(1)} · land ${(c.landFrac * 100).toFixed(0)}% · civs ${c.civsAlive} · towns ${c.towns} · wars ${c.wars}`,
  );
}
console.log('\nWrote src/config/seedGallery.ts');
