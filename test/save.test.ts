import { describe, expect, it } from 'vitest';
import {
  deserializeState,
  hasSave,
  loadFromLocalStorage,
  saveToLocalStorage,
  serializeState,
} from '../src/persist/save';
import { Simulation } from '../src/sim/simulation';
import { Terrain } from '../src/core/types';

describe('save/load', () => {
  it('round-trips the full simulation state', () => {
    const sim = Simulation.create(7);
    sim.advance(300);
    const restored = deserializeState(serializeState(sim.state));

    expect(restored.day).toBe(sim.state.day);
    expect(restored.time).toBe(sim.state.time);
    expect(restored.seed).toBe(sim.state.seed);
    expect(restored.rngState).toBe(sim.state.rngState);
    expect(restored.civs).toEqual(sim.state.civs);
    expect(restored.settlements).toEqual(sim.state.settlements);
    expect(restored.chronicle).toEqual(sim.state.chronicle);
    expect(restored.world.terrain).toEqual(sim.state.world.terrain);
    for (let i = 0; i < restored.civs.length; i++) {
      for (let j = i + 1; j < restored.civs.length; j++) {
        expect(restored.relations[i][j].score).toBe(sim.state.relations[i][j].score);
        expect(restored.relations[i][j]).toBe(restored.relations[j][i]);
      }
    }
  });

  it('continues deterministically after a round-trip', () => {
    const original = Simulation.create(21);
    original.advance(250);
    const reloaded = new Simulation(deserializeState(serializeState(original.state)));
    original.advance(200);
    reloaded.advance(200);
    expect(serializeState(reloaded.state)).toEqual(serializeState(original.state));
  });

  it('replays terrain modifications onto the regenerated world', () => {
    const sim = Simulation.create(7);
    const idx = 5;
    sim.state.world.terrain[idx] = Terrain.Desert;
    sim.state.terrainMods.push([idx, Terrain.Desert]);
    const restored = deserializeState(serializeState(sim.state));
    expect(restored.world.terrain[idx]).toBe(Terrain.Desert);
  });

  it('degrades gracefully without localStorage (node environment)', () => {
    const sim = Simulation.create(3);
    expect(saveToLocalStorage(sim.state)).toBe(false);
    expect(loadFromLocalStorage()).toBeNull();
    expect(hasSave()).toBe(false);
  });
});
