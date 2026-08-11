import { describe, expect, it } from 'vitest';
import { Terrain } from '../src/core/types';
import { AgentSystem, type Agent } from '../src/sim/agents';
import { makeCiv, makeSettlement, makeState, makeWorld } from './util';

describe('citizen agent lifecycle', () => {
  it('rebinds visible citizens when their settlement is captured', () => {
    const settlement = makeSettlement(1, 0, 5, 5, { population: 100 });
    const state = makeState(
      makeWorld(12, 12, Terrain.Grassland),
      [makeCiv(0), makeCiv(1)],
      [settlement],
    );
    const system = new AgentSystem();
    const view = { x0: 0, y0: 0, x1: 10, y1: 10 };
    system.sync(state, view);
    expect(system.agents.length).toBeGreaterThan(0);

    const citizen = system.agents[0];
    citizen.state = 'fighting';
    citizen.pendingState = 'fighting';
    citizen.route = [{ x: 99, y: 99 }];
    citizen.tx = 99;
    citizen.ty = 99;

    settlement.civId = 1;
    system.sync(state, view);

    expect(citizen.civId).toBe(1);
    expect(citizen.state).toBe('idle');
    expect(citizen.pendingState).toBe('idle');
    expect(citizen.route).toBeUndefined();
    expect(citizen.tx).toBe(citizen.x);
    expect(citizen.ty).toBe(citizen.y);
  });

  it('lets a trader dwell at its destination instead of resetting forever', () => {
    const state = makeState(makeWorld(8, 8, Terrain.Grassland), [makeCiv(0)], []);
    const system = new AgentSystem();
    const trader: Agent = {
      id: 1,
      civId: 0,
      settlementId: 1,
      x: 20,
      y: 20,
      tx: 20,
      ty: 20,
      homeX: 20,
      homeY: 20,
      state: 'trading',
      pendingState: 'trading',
      timer: 1,
      phase: 0,
      speed: 10,
    };
    system.agents.push(trader);

    system.update(0.25, state, 0);

    expect(trader.state).toBe('trading');
    expect(trader.timer).toBeCloseTo(0.75, 6);
  });
});
