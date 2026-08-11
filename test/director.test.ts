import { describe, expect, it } from 'vitest';
import type { Camera } from '../src/render/camera';
import { Director } from '../src/showcase/director';
import { Terrain, type ChronicleEntry } from '../src/core/types';
import { makeCiv, makeSettlement, makeState, makeWorld } from './util';

function fakeCamera() {
  let flights = 0;
  let cancels = 0;
  const camera = {
    x: 0,
    y: 0,
    scale: 1,
    flyTo: () => {
      flights++;
    },
    cancelFlight: () => {
      cancels++;
    },
    flying: () => true,
  } as unknown as Camera;
  return { camera, flights: () => flights, cancels: () => cancels };
}

function entry(kind: string, importance: 1 | 2 | 3, day: number, x?: number, y?: number): ChronicleEntry {
  return { kind, importance, day, year: 1, season: 0, text: kind, civId: 0, x, y };
}

describe('attract-mode director lifecycle', () => {
  it('cancels an in-flight camera move when attract mode stops', () => {
    const state = makeState(
      makeWorld(20, 20, Terrain.Grassland),
      [makeCiv(0)],
      [makeSettlement(1, 0, 10, 10)],
    );
    const { camera, flights, cancels } = fakeCamera();

    const director = new Director();
    director.start(state, camera);
    expect(director.active).toBe(true);
    expect(flights()).toBe(1);

    director.stop();
    expect(director.active).toBe(false);
    expect(director.current).toBeNull();
    expect(cancels()).toBe(1);
  });

  it('still sees a breaking event when chronicle compaction replaces the array', () => {
    const state = makeState(
      makeWorld(20, 20, Terrain.Grassland),
      [makeCiv(0)],
      [makeSettlement(1, 0, 10, 10)],
    );
    state.day = 100;
    const oldA = entry('flood', 1, 99, 1, 1);
    const oldB = entry('village', 1, 99, 2, 2);
    state.chronicle = [oldA, oldB];
    const { camera, flights } = fakeCamera();
    const director = new Director();
    director.start(state, camera);
    expect(flights()).toBe(1);

    // Same length, new array: exactly what bounded compaction can produce after
    // dropping old history and appending a new event.
    const breaking = entry('capture', 3, 100, 4, 4);
    state.chronicle = [oldB, breaking];
    director.update(0.016, state, camera);

    expect(flights()).toBe(2);
    expect(director.current?.kind).toBe('capture');
  });
});
