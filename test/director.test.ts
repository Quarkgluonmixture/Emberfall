import { describe, expect, it } from 'vitest';
import type { Camera } from '../src/render/camera';
import { Director } from '../src/showcase/director';
import { Terrain } from '../src/core/types';
import { makeCiv, makeSettlement, makeState, makeWorld } from './util';

describe('attract-mode director lifecycle', () => {
  it('cancels an in-flight camera move when attract mode stops', () => {
    const state = makeState(
      makeWorld(20, 20, Terrain.Grassland),
      [makeCiv(0)],
      [makeSettlement(1, 0, 10, 10)],
    );
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

    const director = new Director();
    director.start(state, camera);
    expect(director.active).toBe(true);
    expect(flights).toBe(1);

    director.stop();
    expect(director.active).toBe(false);
    expect(director.current).toBeNull();
    expect(cancels).toBe(1);
  });
});
