/**
 * Procedural world generation. Fully deterministic: the same seed always
 * produces an identical world. Uses stateless value-noise (hash-based) plus a
 * dedicated RNG stream for river placement, so it is independent of the
 * simulation's RNG.
 */
import { hash2, RNG } from '../core/rng';
import { Terrain, type World } from '../core/types';
import { BALANCE } from '../config/balance';

/** Smoothstep-interpolated lattice value noise in [0, 1). */
export function valueNoise(seed: number, x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(seed, xi, yi);
  const b = hash2(seed, xi + 1, yi);
  const c = hash2(seed, xi, yi + 1);
  const d = hash2(seed, xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Fractal Brownian motion over value noise, normalized to ~[0, 1]. */
export function fbm(seed: number, x: number, y: number, octaves = 4, gain = 0.5): number {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(seed + i * 1013, x * freq, y * freq);
    norm += amp;
    amp *= gain;
    freq *= 2;
  }
  return sum / norm;
}

export function generateWorld(
  seed: number,
  width: number = BALANCE.map.width,
  height: number = BALANCE.map.height,
): World {
  const size = width * height;
  const terrain = new Uint8Array(size);
  const elevation = new Float32Array(size);
  const moisture = new Float32Array(size);
  const temperature = new Float32Array(size);
  const owner = new Int16Array(size).fill(-1);

  const seaLevel = BALANCE.map.seaLevel;
  const mountainLevel = BALANCE.map.mountainLevel;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const nx = (x / (width - 1)) * 2 - 1;
      const ny = (y / (height - 1)) * 2 - 1;
      // Edge falloff pushes map borders underwater so the world reads as an island realm.
      const edge = Math.max(Math.abs(nx), Math.abs(ny));
      const e0 = fbm(seed ^ 0x1009, x * 0.035, y * 0.035, 5);
      // Stretch contrast: normalized fBm clusters around 0.5, which would
      // starve the map of both deep oceans and mountain peaks.
      const e = (e0 - 0.5) * 1.4 + 0.5 - 0.45 * Math.pow(edge, 3);
      elevation[i] = e;

      const lat = 1 - Math.abs(ny); // 1 at equator (map middle), 0 at poles
      let t = lat * 0.85 + fbm(seed ^ 0x2003, x * 0.05, y * 0.05, 3) * 0.3;
      t -= Math.max(0, e - 0.6) * 0.7; // high ground is cold
      temperature[i] = Math.min(1, Math.max(0, t));

      moisture[i] = fbm(seed ^ 0x3007, x * 0.045, y * 0.045, 4);
    }
  }

  // Biome classification.
  for (let i = 0; i < size; i++) {
    const e = elevation[i];
    const t = temperature[i];
    const m = moisture[i];
    let terr: Terrain;
    if (e < seaLevel) terr = Terrain.Ocean;
    else if (e > mountainLevel) terr = Terrain.Mountain;
    else if (t < 0.22) terr = Terrain.Tundra;
    else if (m < 0.26 && t > 0.62) terr = Terrain.Desert;
    else if (m > 0.72 && e < 0.45) terr = Terrain.Swamp;
    else if (m > 0.52) terr = Terrain.Forest;
    else terr = Terrain.Grassland;
    terrain[i] = terr;
  }

  carveRivers(seed, width, height, terrain, elevation);

  // Coast: low land touching ocean becomes shore.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const t = terrain[i];
      if (t === Terrain.Ocean || t === Terrain.Mountain || t === Terrain.River) continue;
      const oceanAdjacent =
        (x > 0 && terrain[i - 1] === Terrain.Ocean) ||
        (x < width - 1 && terrain[i + 1] === Terrain.Ocean) ||
        (y > 0 && terrain[i - width] === Terrain.Ocean) ||
        (y < height - 1 && terrain[i + width] === Terrain.Ocean);
      if (oceanAdjacent) terrain[i] = Terrain.Coast;
    }
  }

  return { width, height, seed, terrain, elevation, moisture, temperature, owner };
}

/** Trace rivers from high ground downhill to the sea. */
function carveRivers(
  seed: number,
  width: number,
  height: number,
  terrain: Uint8Array,
  elevation: Float32Array,
): void {
  const rng = new RNG(seed ^ 0x71e45);
  const size = width * height;

  // Candidate sources: high land.
  let sources: number[] = [];
  for (let i = 0; i < size; i++) {
    if (elevation[i] > 0.65 && terrain[i] !== Terrain.Ocean) sources.push(i);
  }
  if (sources.length === 0) {
    // Flat world fallback: take the highest tiles so rivers always exist.
    sources = Array.from({ length: size }, (_, i) => i)
      .sort((a, b) => elevation[b] - elevation[a])
      .slice(0, 50);
  }
  rng.shuffle(sources);

  const riverCount = rng.int(BALANCE.map.riverCountMin, BALANCE.map.riverCountMax);
  for (let r = 0; r < riverCount && r < sources.length; r++) {
    let cur = sources[r];
    let curElev = elevation[cur];
    const visited = new Set<number>();
    for (let step = 0; step < 500; step++) {
      if (terrain[cur] === Terrain.Ocean) break;
      if (terrain[cur] === Terrain.River && step > 0) break; // joined an existing river
      terrain[cur] = Terrain.River;
      visited.add(cur);

      const x = cur % width;
      const y = Math.floor(cur / width);
      let best = -1;
      let bestElev = Infinity;
      const tryNeighbor = (ni: number) => {
        if (visited.has(ni)) return;
        if (elevation[ni] < bestElev) {
          bestElev = elevation[ni];
          best = ni;
        }
      };
      if (x > 0) tryNeighbor(cur - 1);
      if (x < width - 1) tryNeighbor(cur + 1);
      if (y > 0) tryNeighbor(cur - width);
      if (y < height - 1) tryNeighbor(cur + width);
      if (best === -1) break; // boxed in
      // Always flow somewhere; carve through small rises by lowering our notion of height.
      curElev = Math.min(curElev, bestElev) - 0.0005;
      cur = best;
    }
  }
}
