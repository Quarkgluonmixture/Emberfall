import { Terrain } from '../core/types';

export interface TerrainDef {
  name: string;
  /** Daily yield potential contributed per tile in a settlement's gather radius. */
  food: number;
  wood: number;
  stone: number;
  /** Citizens can walk here. */
  passable: boolean;
  /** Settlements can be founded here. */
  buildable: boolean;
  /** Tile color per season [spring, summer, autumn, winter]. */
  seasonColors: [number, number, number, number];
}

export const TERRAIN_DEFS: Record<Terrain, TerrainDef> = {
  [Terrain.Ocean]: {
    name: 'Ocean',
    food: 0.25,
    wood: 0,
    stone: 0,
    passable: false,
    buildable: false,
    seasonColors: [0x1d3450, 0x1d3756, 0x1b2f4a, 0x16283f],
  },
  [Terrain.Coast]: {
    name: 'Coast',
    food: 0.8,
    wood: 0,
    stone: 0.05,
    passable: true,
    buildable: true,
    seasonColors: [0xa89e6b, 0xb3a36f, 0xab9763, 0x99a1a6],
  },
  [Terrain.Grassland]: {
    name: 'Grassland',
    food: 1.0,
    wood: 0.05,
    stone: 0.05,
    passable: true,
    buildable: true,
    seasonColors: [0x657f46, 0x6f8a4a, 0x967c40, 0xb6c1c3],
  },
  [Terrain.Forest]: {
    name: 'Forest',
    food: 0.3,
    wood: 1.0,
    stone: 0.02,
    passable: true,
    buildable: true,
    seasonColors: [0x3a5630, 0x3f6135, 0x6e5527, 0x4c5b60],
  },
  [Terrain.Mountain]: {
    name: 'Mountain',
    food: 0,
    wood: 0.05,
    stone: 1.0,
    passable: false,
    buildable: false,
    seasonColors: [0x7a7268, 0x80786c, 0x776e62, 0xb9bec4],
  },
  [Terrain.River]: {
    name: 'River',
    food: 1.2,
    wood: 0,
    stone: 0.02,
    passable: false,
    buildable: false,
    seasonColors: [0x3e6f8e, 0x40769b, 0x3a6585, 0x7fa3b8],
  },
  [Terrain.Swamp]: {
    name: 'Swamp',
    food: 0.4,
    wood: 0.3,
    stone: 0,
    passable: true,
    buildable: false,
    seasonColors: [0x47553f, 0x4c5c41, 0x564f35, 0x5a6464],
  },
  [Terrain.Desert]: {
    name: 'Desert',
    food: 0.05,
    wood: 0,
    stone: 0.2,
    passable: true,
    buildable: true,
    seasonColors: [0xc0a169, 0xcaa96b, 0xbd9c63, 0xb59f78],
  },
  [Terrain.Tundra]: {
    name: 'Tundra',
    food: 0.15,
    wood: 0.1,
    stone: 0.2,
    passable: true,
    buildable: true,
    seasonColors: [0x97a39c, 0x8da08f, 0x9aa093, 0xc7d2d6],
  },
};
