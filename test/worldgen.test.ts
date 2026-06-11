import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { Terrain } from '../src/core/types';
import { generateWorld } from '../src/world/worldgen';

describe('worldgen', () => {
  it('meets the minimum map size', () => {
    const w = generateWorld(1);
    expect(w.width).toBeGreaterThanOrEqual(160);
    expect(w.height).toBeGreaterThanOrEqual(100);
    expect(BALANCE.map.width).toBeGreaterThanOrEqual(160);
    expect(BALANCE.map.height).toBeGreaterThanOrEqual(100);
  });

  it('is fully deterministic for a given seed', () => {
    const a = generateWorld(12345);
    const b = generateWorld(12345);
    expect(a.terrain).toEqual(b.terrain);
    expect(a.elevation).toEqual(b.elevation);
    expect(a.moisture).toEqual(b.moisture);
    expect(a.temperature).toEqual(b.temperature);
  });

  it('produces different worlds for different seeds', () => {
    const a = generateWorld(1);
    const b = generateWorld(2);
    let differs = false;
    for (let i = 0; i < a.terrain.length; i++) {
      if (a.terrain[i] !== b.terrain[i]) {
        differs = true;
        break;
      }
    }
    expect(differs).toBe(true);
  });

  it('contains the core terrain types in every world', () => {
    for (const seed of [1, 42, 1337, 2024]) {
      const w = generateWorld(seed);
      const present = new Set(w.terrain);
      for (const t of [
        Terrain.Ocean,
        Terrain.Coast,
        Terrain.Grassland,
        Terrain.Forest,
        Terrain.Mountain,
        Terrain.River,
      ]) {
        expect(present.has(t), `seed ${seed} missing terrain ${Terrain[t]}`).toBe(true);
      }
    }
  });

  it('produces all nine terrain types across a seed range', () => {
    const union = new Set<number>();
    for (let seed = 1; seed <= 10; seed++) {
      for (const t of generateWorld(seed).terrain) union.add(t);
    }
    for (let t = 0; t < 9; t++) {
      expect(union.has(t), `no seed produced terrain ${Terrain[t]}`).toBe(true);
    }
  });

  it('places coast only against ocean', () => {
    const w = generateWorld(7);
    for (let y = 0; y < w.height; y++) {
      for (let x = 0; x < w.width; x++) {
        const i = y * w.width + x;
        if (w.terrain[i] !== Terrain.Coast) continue;
        const touchesOcean =
          (x > 0 && w.terrain[i - 1] === Terrain.Ocean) ||
          (x < w.width - 1 && w.terrain[i + 1] === Terrain.Ocean) ||
          (y > 0 && w.terrain[i - w.width] === Terrain.Ocean) ||
          (y < w.height - 1 && w.terrain[i + w.width] === Terrain.Ocean);
        expect(touchesOcean).toBe(true);
      }
    }
  });
});
