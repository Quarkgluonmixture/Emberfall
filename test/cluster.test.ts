/**
 * Settlement cluster layout engine: pure-function tests.
 * The giant-wall regression (terrain vetoes exiling buildings tiles away and
 * inflating wall rectangles to district size) is pinned here.
 */
import { describe, expect, it } from 'vitest';
import {
  clusterExtent,
  clusterKey,
  layoutCluster,
  layoutRuin,
  popBucket,
} from '../src/render/settlementCluster';

const ALL = (): boolean => true;

describe('settlement cluster layouts', () => {
  it('is deterministic: same inputs, same layout', () => {
    const a = layoutCluster(17, 2, 280, ALL);
    const b = layoutCluster(17, 2, 280, ALL);
    expect(a).toEqual(b);
    expect(layoutRuin(40, 25, ALL)).toEqual(layoutRuin(40, 25, ALL));
  });

  it('different settlements get different layouts', () => {
    const a = layoutCluster(1, 2, 280, ALL);
    const b = layoutCluster(2, 2, 280, ALL);
    expect(a).not.toEqual(b);
  });

  it('piece counts scale with tier', () => {
    const camp = layoutCluster(5, 0, 30, ALL);
    const village = layoutCluster(5, 1, 120, ALL);
    const town = layoutCluster(5, 2, 350, ALL);
    expect(camp.length).toBeGreaterThanOrEqual(2);
    expect(camp.length).toBeLessThan(6);
    expect(village.length).toBeGreaterThan(camp.length);
    expect(town.length).toBeGreaterThan(village.length);
    // A walled town is a real cluster, not an icon.
    expect(town.length).toBeGreaterThanOrEqual(15);
  });

  it('layouts only change when the population bucket changes', () => {
    // 71 and 104 share bucket 2 (35-wide buckets); 105 starts bucket 3.
    expect(layoutCluster(9, 1, 71, ALL)).toEqual(layoutCluster(9, 1, 104, ALL));
    expect(clusterKey(1, 71)).toBe(clusterKey(1, 104));
    expect(clusterKey(1, 104)).not.toBe(clusterKey(1, 105));
    expect(popBucket(0)).toBe(0);
    expect(popBucket(35)).toBe(1);
  });

  it('respects the buildable veto', () => {
    // Nothing may stand west of the center (e.g. open sea).
    const eastOnly = (dx: number): boolean => dx >= 0;
    for (const tier of [0, 1, 2] as const) {
      const layout = layoutCluster(11, tier, 300, ALL, eastOnly);
      for (const p of layout) {
        expect(p.dx, `${p.kind} placed west of the waterline`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('never exiles pieces to district distance (giant-wall regression)', () => {
    // A hostile checkerboard veto forces lots of placement retries.
    const patchy = (dx: number, dy: number): boolean =>
      (Math.floor(dx / 8) + Math.floor(dy / 8)) % 2 === 0;
    for (const id of [1, 7, 23, 99]) {
      const layout = layoutCluster(id, 2, 400, ALL, patchy);
      const ext = clusterExtent(layout);
      expect(ext.rx).toBeLessThanOrEqual(40);
      expect(ext.ry).toBeLessThanOrEqual(30);
    }
  });

  it('sorts painter order back to front', () => {
    const layout = layoutCluster(3, 2, 300, ALL);
    for (let i = 1; i < layout.length; i++) {
      expect(layout[i].dy).toBeGreaterThanOrEqual(layout[i - 1].dy);
    }
  });

  it('degrades gracefully when piece art is missing', () => {
    const onlyHuts = (k: string): boolean => k.startsWith('hut_');
    const layout = layoutCluster(8, 2, 300, onlyHuts);
    expect(layout.length).toBeGreaterThan(5);
    for (const p of layout) expect(p.kind.startsWith('hut_')).toBe(true);
    expect(layoutCluster(8, 2, 300, () => false)).toEqual([]);
  });

  it('ruins scatter a few broken pieces', () => {
    const ruin = layoutRuin(52, 33, ALL);
    expect(ruin.length).toBeGreaterThanOrEqual(2);
    expect(ruin.length).toBeLessThanOrEqual(4);
    for (const p of ruin) expect(p.kind.startsWith('ruin_')).toBe(true);
  });
});
