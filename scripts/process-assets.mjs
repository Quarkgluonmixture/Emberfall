/**
 * Asset pipeline: turn raw GPT-Image exports (assets_src/raw/<1..5>/) into
 * game-ready PNGs in public/assets/.
 *
 * The raw exports have FAKE transparency (a checkerboard baked into opaque
 * pixels), so sprites are chroma-keyed: flood-fill from the borders removing
 * neutral bright pixels, which preserves warm/colored artwork inside.
 * Run: node scripts/process-assets.mjs
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const proj = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rawRoot = path.join(proj, 'assets_src', 'raw');
const outDir = path.join(proj, 'public', 'assets');
fs.mkdirSync(outDir, { recursive: true });

function sources(folder) {
  return fs
    .readdirSync(path.join(rawRoot, folder))
    .filter((f) => f.endsWith('.png'))
    .sort()
    .map((f) => path.join(rawRoot, folder, f));
}

/** Neutral (gray) and bright → checkerboard background candidate. */
function isBackground(data, i) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  return mx - mn <= 14 && mn >= 185;
}

/** Flood-fill transparent from the borders, then resize and save. */
async function keyAndResize(src, dst, targetW, targetH = 0, crop = null) {
  let img = sharp(src);
  if (crop) img = img.extract({ left: crop.x, top: crop.y, width: crop.w, height: crop.h });
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;

  const visited = new Uint8Array(W * H);
  const stack = [];
  for (let x = 0; x < W; x++) {
    stack.push(x, (H - 1) * W + x);
  }
  for (let y = 0; y < H; y++) {
    stack.push(y * W, y * W + W - 1);
  }
  let removed = 0;
  while (stack.length > 0) {
    const idx = stack.pop();
    if (visited[idx]) continue;
    visited[idx] = 1;
    if (!isBackground(data, idx * 4)) continue;
    data[idx * 4 + 3] = 0;
    removed++;
    const x = idx % W;
    const y = (idx / W) | 0;
    if (x > 0) stack.push(idx - 1);
    if (x < W - 1) stack.push(idx + 1);
    if (y > 0) stack.push(idx - W);
    if (y < H - 1) stack.push(idx + W);
  }
  const keptFraction = 1 - removed / (W * H);
  if (keptFraction < 0.01) {
    console.warn(`  SKIP ${path.basename(dst)} — keying removed ${(100 * (1 - keptFraction)).toFixed(1)}% of pixels`);
    return;
  }
  if (!targetH) targetH = Math.round((H * targetW) / W);
  await sharp(Buffer.from(data), { raw: { width: W, height: H, channels: 4 } })
    .resize(targetW, targetH, { fit: 'fill', kernel: 'lanczos3' })
    .png()
    .toFile(dst);
  console.log(
    `  ${path.basename(dst)}  ${targetW}x${targetH}  (kept ${(keptFraction * 100).toFixed(0)}% of pixels)`,
  );
}

async function plainResize(src, dst, w, h) {
  await sharp(src).resize(w, h, { fit: 'fill', kernel: 'lanczos3' }).png().toFile(dst);
  console.log(`  ${path.basename(dst)}  ${w}x${h}`);
}

const out = (name) => path.join(outDir, name);

/** Flood-fill transparency from the borders for bright art on solid black. */
async function keyDarkTrimResize(src, dst, targetW) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const visited = new Uint8Array(W * H);
  const stack = [];
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
  while (stack.length > 0) {
    const idx = stack.pop();
    if (visited[idx]) continue;
    visited[idx] = 1;
    const i = idx * 4;
    if (Math.max(data[i], data[i + 1], data[i + 2]) > 40) continue;
    data[i + 3] = 0;
    const x = idx % W;
    const y = (idx / W) | 0;
    if (x > 0) stack.push(idx - 1);
    if (x < W - 1) stack.push(idx + 1);
    if (y > 0) stack.push(idx - W);
    if (y < H - 1) stack.push(idx + W);
  }
  await sharp(Buffer.from(data), { raw: { width: W, height: H, channels: 4 } })
    .trim({ threshold: 12 })
    .resize(targetW)
    .png()
    .toFile(dst);
  console.log(`  ${path.basename(dst)}  w=${targetW} (dark-keyed, trimmed)`);
}

/** Brightness becomes alpha — for soft gradients (smoke, glow, rain) on black. */
async function lumaAlphaResize(src, dst, { w = null, h = null, trim = false }) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    data[i + 3] = Math.max(data[i], data[i + 1], data[i + 2]);
  }
  let img = sharp(Buffer.from(data), {
    raw: { width: info.width, height: info.height, channels: 4 },
  });
  if (trim) img = img.trim({ threshold: 12 });
  await img.resize(w, h).png().toFile(dst);
  console.log(`  ${path.basename(dst)}  ${w ?? 'auto'}x${h ?? 'auto'} (luma-alpha)`);
}

// Folder 6: black-background regenerations of the unkeyable bright assets.
if (fs.existsSync(path.join(rawRoot, '6'))) {
  console.log('Black-background effects (folder 6):');
  const dark = sources('6'); // order: banner, smoke strip, glow, raindrop
  await keyDarkTrimResize(dark[0], out('banner.png'), 64);
  await lumaAlphaResize(dark[1], out('fx_smoke.png'), { w: 256, h: 64 });
  await lumaAlphaResize(dark[2], out('fx_glow.png'), { w: 128, h: 128 });
  await lumaAlphaResize(dark[3], out('fx_raindrop.png'), { h: 24, trim: true });
} else {
  // Without folder 6 those sources are unkeyable: procedural fallbacks win.
  for (const stale of ['fx_glow.png', 'fx_smoke.png', 'fx_wildfire.png', 'banner.png']) {
    if (fs.existsSync(out(stale))) {
      fs.rmSync(out(stale));
      console.log(`removed ${stale} (uses procedural fallback instead)`);
    }
  }
}

// Folder 7: wildfire flame strip on solid black (luma-alpha, like smoke).
if (fs.existsSync(path.join(rawRoot, '7'))) {
  console.log('Wildfire flames (folder 7):');
  await lumaAlphaResize(sources('7')[0], out('fx_wildfire.png'), { w: 256, h: 64 });
}

// Folder 8: river bend/mouth seasonal sheets (3 variants × 2 shapes, opaque).
if (fs.existsSync(path.join(rawRoot, '8'))) {
  console.log('River bend/mouth sheets (folder 8):');
  const riv = sources('8'); // 1_spring.png … 4_winter.png (sorted)
  const seasons = ['spring', 'summer', 'autumn', 'winter'];
  for (let i = 0; i < seasons.length; i++) {
    await plainResize(riv[i], out(`terrain_river_${seasons[i]}.png`), 192, 128);
  }
}

console.log('Effects (folder 1):');
const fx = sources('1');
// fx[0] glow, fx[1] smoke, fx[2] wildfire and the raindrop half of fx[3] are
// skipped here: that art is neutral/bright or gradient-edged and cannot be
// keyed off a baked checkerboard. Folder 6 (black background) supplies them.
await keyAndResize(fx[3], out('fx_snowflake.png'), 16, 16, { x: 887, y: 0, w: 887, h: 887 });

console.log('Citizens (folder 3):');
const cit = sources('3');
await keyAndResize(cit[0], out('citizen_walk.png'), 192, 96);
await keyAndResize(cit[1], out('citizen_work.png'), 192, 96);
await keyAndResize(cit[2], out('citizen_fight.png'), 192, 96);
await keyAndResize(cit[3], out('citizen_rest.png'), 96, 96);

console.log('Settlements (folder 4):');
const set = sources('4');
await keyAndResize(set[0], out('settlement_camp.png'), 128);
await keyAndResize(set[1], out('settlement_village.png'), 160);
await keyAndResize(set[2], out('settlement_town.png'), 192);
await keyAndResize(set[3], out('settlement_ruins.png'), 160);
// set[4] banner is white cloth on a checkerboard — unkeyable; procedural banner stays.

console.log('Terrain sheets (folder 5):');
const ter = sources('5');
await plainResize(ter[0], out('terrain_spring.png'), 192, 576);
await plainResize(ter[1], out('terrain_summer.png'), 192, 576);
await plainResize(ter[2], out('terrain_autumn.png'), 192, 576);
await plainResize(ter[3], out('terrain_winter.png'), 192, 576);

// Music: Suno-generated instrumentals (assets_src/music/) renamed to the
// role-based filenames the MusicManager expects (src/audio/music.ts).
console.log('Music (assets_src/music):');
const musicDir = path.join(proj, 'assets_src', 'music');
const MUSIC_MAP = [
  ['Cinder Lullaby.mp3', 'theme.mp3'],
  ['Apple Orchard.mp3', 'spring.mp3'],
  ['Hearth Festival.mp3', 'summer.mp3'],
  ['Golden Harveststrings.mp3', 'autumn.mp3'],
  ['Frosted Palimpsest.mp3', 'winter.mp3'],
  ['Owlwood Lullaby.mp3', 'night.mp3'],
  ['Cinder Canticles.mp3', 'war.mp3'],
  ['Golden Ashes.mp3', 'disaster.mp3'],
  ['Candle Ironwood.mp3', 'goldenage.mp3'],
];
if (fs.existsSync(musicDir)) {
  const musicOut = path.join(outDir, 'music');
  fs.mkdirSync(musicOut, { recursive: true });
  for (const [src, dst] of MUSIC_MAP) {
    const srcPath = path.join(musicDir, src);
    if (!fs.existsSync(srcPath)) {
      console.warn(`  MISSING ${src}`);
      continue;
    }
    fs.copyFileSync(srcPath, path.join(musicOut, dst));
    console.log(`  ${dst}  ←  ${src}`);
  }
}

console.log('Done.');
