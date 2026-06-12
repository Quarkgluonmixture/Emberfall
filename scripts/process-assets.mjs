/**
 * Asset pipeline: turn raw GPT-Image exports (assets_src/raw/<n>/) into
 * game-ready PNGs in public/assets/. Run: node scripts/process-assets.mjs
 *
 * Raw folder map (prompt specs in ASSET_PROMPTS.md):
 *   1  effects (snowflake; rest superseded by 6)     6  black-bg fx (banner/smoke/glow/rain)
 *   2  (unused)                                      7  wildfire flame strip (black-bg)
 *   3  citizen anim strips                           8  river bend/mouth seasonal sheets
 *   4  settlement single sprites (legacy fallback)   9  building pieces → pieces/
 *   5  terrain seasonal sheets                      10  terrain decor grids → decor/
 *  11  vertical wall pieces → pieces/               12  landmark decor (mountains/canopies) → decor/
 *  13  6-variant terrain sheets (supersede 5's 3-variant bake targets when present)
 *
 * The raw exports have FAKE transparency (a checkerboard baked into opaque
 * pixels), so sprites are chroma-keyed: flood-fill from the borders removing
 * neutral bright pixels, which preserves warm/colored artwork inside.
 * Bright/white art is regenerated on solid black and dark-keyed instead.
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

/** Flood-fill transparent from the borders, then resize and save.
    vtrim: crop empty rows above/below the art (whole strip, so frames stay
    aligned) — generated sprites carry big margins that otherwise make
    anchored feet float above the ground. */
async function keyAndResize(src, dst, targetW, targetH = 0, crop = null, vtrim = false) {
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
    console.warn(
      `  SKIP ${path.basename(dst)} — keying removed ${(100 * (1 - keptFraction)).toFixed(1)}% of pixels`,
    );
    return;
  }
  let buf = Buffer.from(data);
  let outH = H;
  let trimNote = '';
  if (vtrim) {
    let top = H;
    let bottom = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (data[(y * W + x) * 4 + 3] > 30) {
          if (y < top) top = y;
          if (y > bottom) bottom = y;
          break;
        }
      }
    }
    if (bottom > top) {
      const t0 = Math.max(0, top - 4);
      const b0 = Math.min(H - 1, bottom + 4);
      buf = buf.subarray(t0 * W * 4, (b0 + 1) * W * 4);
      outH = b0 - t0 + 1;
      trimNote = ` (vtrim ${H}→${outH} rows)`;
    }
  }
  if (!targetH || vtrim) targetH = Math.round((outH * targetW) / W);
  await sharp(buf, { raw: { width: W, height: outH, channels: 4 } })
    .resize(targetW, targetH, { fit: 'fill', kernel: 'lanczos3' })
    .png()
    .toFile(dst);
  if (trimNote) console.log(`   ${trimNote.trim()}`);
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

/**
 * Folders 9/10 — building pieces & terrain decor for the settlement-cluster
 * rework (see ASSET_PROMPTS.md). Each raw image holds several isolated objects
 * on white; we key the background, find connected alpha components, merge
 * near-neighbours (flames over a campfire ring, detached leaves), then emit
 * one trimmed PNG per piece. Works for both horizontal strips and row grids.
 */
async function slicePieces(src, outNames, gap = 28) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;

  // Key the connected white/checkerboard background from the borders.
  const visited = new Uint8Array(W * H);
  const stack = [];
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
  while (stack.length > 0) {
    const idx = stack.pop();
    if (visited[idx]) continue;
    visited[idx] = 1;
    if (!isBackground(data, idx * 4)) continue;
    data[idx * 4 + 3] = 0;
    const x = idx % W;
    const y = (idx / W) | 0;
    if (x > 0) stack.push(idx - 1);
    if (x < W - 1) stack.push(idx + 1);
    if (y > 0) stack.push(idx - W);
    if (y < H - 1) stack.push(idx + W);
  }

  // Label connected components of the remaining opaque pixels.
  const label = new Int32Array(W * H).fill(-1);
  const boxes = [];
  for (let start = 0; start < W * H; start++) {
    if (label[start] >= 0 || data[start * 4 + 3] === 0) continue;
    const id = boxes.length;
    const box = { x0: W, y0: H, x1: 0, y1: 0, area: 0 };
    const q = [start];
    label[start] = id;
    while (q.length > 0) {
      const idx = q.pop();
      const x = idx % W;
      const y = (idx / W) | 0;
      box.x0 = Math.min(box.x0, x);
      box.y0 = Math.min(box.y0, y);
      box.x1 = Math.max(box.x1, x);
      box.y1 = Math.max(box.y1, y);
      box.area++;
      for (const n of [idx - 1, idx + 1, idx - W, idx + W]) {
        if (n < 0 || n >= W * H) continue;
        if (Math.abs((n % W) - x) > 1) continue;
        if (label[n] >= 0 || data[n * 4 + 3] === 0) continue;
        label[n] = id;
        q.push(n);
      }
    }
    boxes.push(box);
  }

  // Merge fragments: union boxes whose rects (grown by gap) intersect — but
  // only while we have MORE components than expected pieces; a clean sheet
  // (one component per piece) must not be glued together by tight layouts.
  const GAP = gap;
  let pieces = boxes.filter((b) => b.area > 400);
  let merged = true;
  while (merged && pieces.length > outNames.length) {
    merged = false;
    outer: for (let i = 0; i < pieces.length; i++) {
      for (let j = i + 1; j < pieces.length; j++) {
        const a = pieces[i];
        const b = pieces[j];
        if (a.x0 - GAP < b.x1 && b.x0 - GAP < a.x1 && a.y0 - GAP < b.y1 && b.y0 - GAP < a.y1) {
          a.x0 = Math.min(a.x0, b.x0);
          a.y0 = Math.min(a.y0, b.y0);
          a.x1 = Math.max(a.x1, b.x1);
          a.y1 = Math.max(a.y1, b.y1);
          a.area += b.area;
          pieces.splice(j, 1);
          merged = true;
          break outer;
        }
      }
    }
  }

  // Sort into reading order: rows by vertical overlap, then left to right.
  pieces.sort((a, b) => (a.y0 + a.y1) / 2 - (b.y0 + b.y1) / 2);
  const rows = [];
  for (const p of pieces) {
    const row = rows.find((r) => {
      const overlap = Math.min(r.y1, p.y1) - Math.max(r.y0, p.y0);
      return overlap > 0.3 * Math.min(r.y1 - r.y0, p.y1 - p.y0);
    });
    if (row) {
      row.items.push(p);
      row.y0 = Math.min(row.y0, p.y0);
      row.y1 = Math.max(row.y1, p.y1);
    } else {
      rows.push({ y0: p.y0, y1: p.y1, items: [p] });
    }
  }
  const ordered = rows.flatMap((r) => r.items.sort((a, b) => a.x0 - b.x0));

  if (ordered.length !== outNames.length) {
    console.warn(
      `  SKIP ${path.basename(src)} — found ${ordered.length} pieces, expected ${outNames.length}`,
    );
    return;
  }
  for (let i = 0; i < ordered.length; i++) {
    const [name, targetW] = outNames[i];
    const p = ordered[i];
    const pad = 4;
    const left = Math.max(0, p.x0 - pad);
    const top = Math.max(0, p.y0 - pad);
    await sharp(Buffer.from(data), { raw: { width: W, height: H, channels: 4 } })
      .extract({
        left,
        top,
        width: Math.min(W, p.x1 + pad) - left,
        height: Math.min(H, p.y1 + pad) - top,
      })
      .resize({ width: targetW, kernel: 'lanczos3' })
      .png()
      .toFile(name);
    console.log(`  ${path.relative(outDir, name)}  w=${targetW}`);
  }
}

const PIECE_SETS = [
  [
    '01_tents.png',
    [
      ['tent_0', 44],
      ['tent_1', 44],
    ],
  ],
  [
    '02_huts.png',
    [
      ['hut_0', 48],
      ['hut_1', 48],
      ['hut_2', 48],
    ],
  ],
  [
    '03_houses.png',
    [
      ['house_0', 52],
      ['house_1', 52],
      ['house_2', 52],
    ],
  ],
  [
    '04_storage.png',
    [
      ['granary', 44],
      ['shed', 44],
      ['crates', 30],
    ],
  ],
  [
    '05_civic.png',
    [
      ['shrine', 34],
      ['well', 30],
    ],
  ],
  [
    '06_market.png',
    [
      ['stall_0', 40],
      ['stall_1', 40],
    ],
  ],
  ['07_temple.png', [['hall', 96]]],
  [
    '08_walls_stone.png',
    [
      ['wall_straight', 56],
      ['wall_tower', 48],
      ['wall_gate', 64],
    ],
  ],
  [
    '09_palisade.png',
    [
      ['palisade_straight', 48],
      ['palisade_corner', 44],
    ],
  ],
  [
    '10_props.png',
    [
      ['lamp', 22],
      ['scaffold', 40],
      ['campfire', 32],
    ],
  ],
  [
    '11_ruins.png',
    [
      ['ruin_0', 40],
      ['ruin_1', 44],
      ['ruin_2', 40],
    ],
  ],
];
// Decor sheets share one 5-row layout; sheet B continues the variant indices.
const DECOR_ROWS = [
  ['rock', 36, 3],
  ['tree_broadleaf', 46, 2],
  ['tree_conifer', 42, 2],
  ['reed', 30, 2],
  ['bush', 28, 2],
];

if (fs.existsSync(path.join(rawRoot, '9'))) {
  console.log('Building pieces (folder 9):');
  const piecesDir = path.join(outDir, 'pieces');
  fs.mkdirSync(piecesDir, { recursive: true });
  for (const [file, targets] of PIECE_SETS) {
    const src = path.join(rawRoot, '9', file);
    if (!fs.existsSync(src)) {
      console.warn(`  missing ${file} (not generated yet) — skipped`);
      continue;
    }
    await slicePieces(
      src,
      targets.map(([n, w]) => [path.join(piecesDir, `${n}.png`), w]),
    );
  }
}

// Folder 11: dedicated N-S wall art (vertical runs of town walls).
if (fs.existsSync(path.join(rawRoot, '11'))) {
  console.log('Vertical wall pieces (folder 11):');
  const piecesDir = path.join(outDir, 'pieces');
  fs.mkdirSync(piecesDir, { recursive: true });
  const src = path.join(rawRoot, '11', '01_walls_vertical.png');
  if (fs.existsSync(src)) {
    await slicePieces(src, [
      [path.join(piecesDir, 'wall_vertical.png'), 28],
      [path.join(piecesDir, 'palisade_vertical.png'), 28],
    ]);
  }
}

// Folder 12: large landmark decor breaking up biome tiling repetition.
if (fs.existsSync(path.join(rawRoot, '12'))) {
  console.log('Terrain landmarks (folder 12):');
  const decorDir = path.join(outDir, 'decor');
  fs.mkdirSync(decorDir, { recursive: true });
  const mountains = path.join(rawRoot, '12', '01_mountain_formations.png');
  if (fs.existsSync(mountains)) {
    await slicePieces(mountains, [
      [path.join(decorDir, 'mountain_formation_0.png'), 90],
      [path.join(decorDir, 'mountain_formation_1.png'), 90],
      [path.join(decorDir, 'mountain_formation_2.png'), 90],
    ]);
  }
  const canopies = path.join(rawRoot, '12', '02_forest_canopies.png');
  if (fs.existsSync(canopies)) {
    await slicePieces(canopies, [
      [path.join(decorDir, 'canopy_0.png'), 80],
      [path.join(decorDir, 'canopy_1.png'), 80],
    ]);
  }
}

if (fs.existsSync(path.join(rawRoot, '10'))) {
  console.log('Terrain decor (folder 10):');
  const decorDir = path.join(outDir, 'decor');
  fs.mkdirSync(decorDir, { recursive: true });
  const sheets = sources('10');
  for (let s = 0; s < sheets.length; s++) {
    const names = DECOR_ROWS.flatMap(([base, w, count]) =>
      Array.from({ length: count }, (_, i) => [
        path.join(decorDir, `${base}_${s * count + i}.png`),
        w,
      ]),
    );
    await slicePieces(sheets[s], names, 8);
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
await keyAndResize(cit[0], out('citizen_walk.png'), 192, 0, null, true);
await keyAndResize(cit[1], out('citizen_work.png'), 192, 0, null, true);
await keyAndResize(cit[2], out('citizen_fight.png'), 192, 0, null, true);
await keyAndResize(cit[3], out('citizen_rest.png'), 96, 0, null, true);

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

// Folder 13: 6-variant terrain sheets (6 cols × 9 rows). They overwrite the
// folder-5 targets above; the loader detects column count from sheet aspect,
// so a checkout without batch 13 keeps the 3-variant sheets working.
if (fs.existsSync(path.join(rawRoot, '13'))) {
  console.log('Terrain sheets ×6 (folder 13):');
  const six = sources('13'); // 01_spring.png … 04_winter.png (sorted)
  const seasons13 = ['spring', 'summer', 'autumn', 'winter'];
  for (let i = 0; i < seasons13.length; i++) {
    if (!six[i]) {
      console.warn(`  missing sheet ${i + 1} (${seasons13[i]}) — folder-5 bake target kept`);
      continue;
    }
    await plainResize(six[i], out(`terrain_${seasons13[i]}.png`), 384, 576);
  }
}

// SFX: slot-named samples (assets_src/sfx/<sound>.ogg, see SAMPLE_NAMES in
// src/audio/sfx.ts) copied verbatim; any missing slot keeps its WebAudio
// synth fallback. Current samples: Kenney CC0 packs (kenney.nl).
const sfxDir = path.join(proj, 'assets_src', 'sfx');
if (fs.existsSync(sfxDir)) {
  console.log('SFX samples (assets_src/sfx):');
  const sfxOut = path.join(outDir, 'sfx');
  fs.mkdirSync(sfxOut, { recursive: true });
  for (const f of fs.readdirSync(sfxDir).filter((f) => /\.(ogg|mp3|wav)$/.test(f))) {
    fs.copyFileSync(path.join(sfxDir, f), path.join(sfxOut, f));
    console.log(`  ${f}`);
  }
}

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
