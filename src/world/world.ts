/** Tile access helpers over the World data structure. */
import { Terrain, type World } from '../core/types';
import { TERRAIN_DEFS } from '../config/terrainConfig';

export function idx(world: World, x: number, y: number): number {
  return y * world.width + x;
}

export function inBounds(world: World, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < world.width && y < world.height;
}

export function terrainAt(world: World, x: number, y: number): Terrain {
  return world.terrain[idx(world, x, y)] as Terrain;
}

export function isBuildable(t: Terrain): boolean {
  return TERRAIN_DEFS[t].buildable;
}

export function isPassable(t: Terrain): boolean {
  return TERRAIN_DEFS[t].passable;
}

/** Iterate tiles in a disk of the given radius (inclusive), clipped to bounds. */
export function* tilesInRadius(
  world: World,
  cx: number,
  cy: number,
  radius: number,
): Generator<{ x: number; y: number; i: number }> {
  const r2 = radius * radius;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy > r2) continue;
      const x = cx + dx;
      const y = cy + dy;
      if (!inBounds(world, x, y)) continue;
      yield { x, y, i: y * world.width + x };
    }
  }
}

export function neighbors4(world: World, x: number, y: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  if (x > 0) out.push([x - 1, y]);
  if (x < world.width - 1) out.push([x + 1, y]);
  if (y > 0) out.push([x, y - 1]);
  if (y < world.height - 1) out.push([x, y + 1]);
  return out;
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

/** True if any tile within `range` of (x, y) has the given terrain. */
export function nearTerrain(
  world: World,
  x: number,
  y: number,
  range: number,
  terrain: Terrain,
): boolean {
  for (const t of tilesInRadius(world, x, y, range)) {
    if (world.terrain[t.i] === terrain) return true;
  }
  return false;
}
