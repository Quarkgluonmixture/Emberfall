/** Print river bend/mouth tile coordinates for a seed (default 1337). */
import { generateWorld } from '../src/world/worldgen';
import { Terrain } from '../src/core/types';

const seed = Number(process.argv[2]) || 1337;
const world = generateWorld(seed);
const { width, height, terrain } = world;

const at = (x: number, y: number): number =>
  x < 0 || y < 0 || x >= width || y >= height ? -1 : terrain[y * width + x];

const bends: string[] = [];
const mouths: string[] = [];
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (terrain[y * width + x] !== Terrain.River) continue;
    const n = [at(x, y - 1), at(x + 1, y), at(x, y + 1), at(x - 1, y)];
    const river = n.map((t) => t === Terrain.River);
    const ocean = n.map((t) => t === Terrain.Ocean);
    if (ocean.some(Boolean)) mouths.push(`(${x},${y})`);
    else if (
      river.filter(Boolean).length === 2 &&
      !(river[0] && river[2]) &&
      !(river[1] && river[3])
    )
      bends.push(`(${x},${y})`);
  }
}
console.log(`seed ${seed}: ${bends.length} bends, ${mouths.length} mouths`);
console.log('bends:', bends.slice(0, 12).join(' '));
console.log('mouths:', mouths.slice(0, 8).join(' '));
