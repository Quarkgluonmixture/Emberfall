/*
 * Art-audit screenshot battery — deterministic 10-shot set for the Gemini
 * art-direction review (`npm run art:shots`).
 *
 * Unlike art-shots.mjs this does NOT rely on wall-clock timing: it drives the
 * ?probe=1 API (window.__emberfall) added in main.ts — synchronous day
 * fast-forward, exact camera placement, frozen ambient light — so the same
 * seed always produces pixel-comparable shots.
 *
 * Needs `npm run dev` running (port auto-detected 5173-5175, or BASE env).
 * Output: docs/art-audit/current/*.jpg + manifest.json (OUT env overrides).
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SEED = Number(process.env.SEED ?? 48);
const OUT = process.env.OUT ?? 'docs/art-audit/current';
fs.mkdirSync(OUT, { recursive: true });

async function detectBase() {
  if (process.env.BASE) return process.env.BASE;
  for (const port of [5173, 5174, 5175]) {
    try {
      const res = await fetch(`http://localhost:${port}/`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) return `http://localhost:${port}`;
    } catch {
      /* next port */
    }
  }
  throw new Error('No dev server found on 5173-5175. Run `npm run dev` first.');
}

const BASE = await detectBase();
const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));

const manifest = [];
async function shot(file, label, description) {
  await page.waitForTimeout(400); // let the locked lighting/camera settle
  await page.screenshot({ path: `${OUT}/${file}.jpg`, type: 'jpeg', quality: 90 });
  const day = await page.evaluate('__emberfall.day');
  manifest.push({ file: `${file}.jpg`, label, description, day, seed: SEED });
  console.log(`  ✓ ${file} (day ${day})`);
}

// ── QA assertions: fail loudly when a zoom band loses its key layers or the
// glow swallows the settlements it should decorate. ──
const failures = [];
async function assertLayers(where, checks) {
  const l = await page.evaluate('__emberfall.layers()');
  if (!l) {
    failures.push(`${where}: layers() unavailable`);
    return;
  }
  for (const [name, pred, expect] of checks) {
    if (!pred(l)) {
      failures.push(`${where}: ${name} — expected ${expect}, got ${JSON.stringify(l)}`);
      console.log(`  ✗ QA ${where}: ${name}`);
    }
  }
}

const ef = (expr) => page.evaluate(expr);

console.log(`Battery: seed ${SEED} → ${OUT} (base ${BASE})`);
await page.goto(`${BASE}/?seed=${SEED}&probe=1`, { waitUntil: 'load', timeout: 30000 });
await page.waitForSelector('#app canvas', { timeout: 20000 });
await page.waitForTimeout(2500);
await ef('__emberfall.setSpeed(0)');
await ef('__emberfall.setAmbient(0.5)'); // noon

// ── Base epoch: year 5 — settled world, villages, first wars brewing ──
await ef('__emberfall.advanceDays(600 - __emberfall.day)');
await page.waitForTimeout(1800); // terrain/territory re-bake + season crossfade

// Most populous settlement = anchor for mid/close framing.
const anchor = await page.evaluate(() => {
  const st = __emberfall.state;
  const best = [...st.settlements].sort((a, b) => b.population - a.population)[0];
  return { x: best.x, y: best.y, name: best.name, tier: best.tier };
});

await ef('__emberfall.centerOn(80, 50, 1.05)');
await shot('01-macro-day', 'macro day', 'Whole 160x100 world at noon, fully zoomed out.');
await assertLayers('macro day', [
  ['strategic glyph layer visible', (l) => l.macroVisible === true, 'macroVisible'],
  ['citizens hidden at macro', (l) => l.citizenAlpha === 0, 'citizenAlpha 0'],
]);
await ef('__emberfall.setAmbient(0)');
await shot('02-macro-night', 'macro night', 'Whole world at midnight: settlement lights, glow control.');
await assertLayers('macro night', [
  ['glow within 3x footprint', (l) => l.maxGlowToFootprint < 3, 'maxGlowToFootprint < 3'],
]);

await ef(`__emberfall.centerOn(${anchor.x}, ${anchor.y}, 2.2)`);
await ef('__emberfall.setAmbient(0.5)');
await shot('03-mid-day', 'mid day', `Default play zoom (2.2x) on the largest settlement region (${anchor.name}) at noon.`);
await ef('__emberfall.setAmbient(0)');
await shot('04-mid-night', 'mid night', 'Same framing at midnight: lighting quality and building visibility.');
await assertLayers('mid night', [
  ['clusters in use', (l) => l.clusters > 0, 'clusters > 0'],
  ['window lamps lit', (l) => l.lampGlows > 0, 'lampGlows > 0'],
  ['glow within 3x footprint', (l) => l.maxGlowToFootprint < 3, 'maxGlowToFootprint < 3'],
]);
await ef('__emberfall.setAmbient(0.5)');
await assertLayers('mid day', [
  ['clusters visible at mid zoom', (l) => l.settlementAlpha > 0.85, 'settlementAlpha > 0.85'],
  ['strategic layer gone at mid zoom', (l) => l.macroVisible === false, '!macroVisible'],
  ['decor scattered', (l) => l.decorCount > 50, 'decorCount > 50'],
]);

// ── Close-ups at the base epoch (spring, not winter): biggest town ──
const town = await page.evaluate(() => {
  const st = __emberfall.state;
  const TIER = ['camp', 'village', 'town'];
  const towns = st.settlements.filter((s) => s.tier === 2);
  const pool = towns.length ? towns : st.settlements;
  const best = [...pool].sort((a, b) => b.population - a.population)[0];
  return { x: best.x, y: best.y, name: best.name, tier: TIER[best.tier], pop: Math.round(best.population) };
});

await ef(`__emberfall.centerOn(${town.x}, ${town.y}, 3.0)`);
await shot(
  '10-town-large',
  'town upgrade / large settlement',
  `Largest ${town.tier} (${town.name}, pop ${town.pop}) with surroundings: scale fantasy, road connections.`,
);

await ef(`__emberfall.centerOn(${town.x}, ${town.y}, 4.5)`);
await ef('__emberfall.stepAgents(15)');
await shot('05-close-settlement', 'close settlement', 'Close-up of the largest settlement at 4.5x: building art, grounding, glow.');

await ef(`__emberfall.centerOn(${town.x}, ${town.y}, 6.5)`);
await ef('__emberfall.stepAgents(25)');
await shot('06-close-citizens', 'close citizens', 'Citizen close-up at 6.5x: action icons above heads — can you tell who is working, trading, resting?');
await assertLayers('close citizens', [
  ['citizens at full contrast', (l) => l.citizenAlpha >= 0.99, 'citizenAlpha 1'],
  ['citizens materialized', (l) => l.citizenCount > 0, 'citizenCount > 0'],
]);

// ── Rain: next strong rain day from the deterministic weather function ──
const rainDay = await page.evaluate(() => {
  for (let d = __emberfall.day + 1; d < __emberfall.day + 2000; d++) {
    const w = __emberfall.weatherAt(d);
    if (w.kind === 'rain' && w.intensity > 0.55) return d;
  }
  return -1;
});
if (rainDay > 0) {
  await ef(`__emberfall.advanceDays(${rainDay} - __emberfall.day)`);
  await page.waitForTimeout(1800);
  await ef(`__emberfall.centerOn(${anchor.x}, ${anchor.y}, 2.2)`);
  await shot('08-rain', 'rain', 'Heavy rain over the largest settlement region, noon, default zoom.');
}

// ── Summer & autumn: full-season coverage, same framing ──
for (const [lo, hi, name, label] of [
  [40, 50, '11-summer', 'summer'],
  [70, 80, '12-autumn', 'autumn'],
]) {
  const day = await page.evaluate(
    `(() => { for (let d = __emberfall.day + 1; d < __emberfall.day + 240; d++) { const p = d % 120; if (p >= ${lo} && p <= ${hi}) return d; } return -1; })()`,
  );
  if (day < 0) continue;
  await ef(`__emberfall.advanceDays(${day} - __emberfall.day)`);
  await page.waitForTimeout(1800);
  await ef(`__emberfall.centerOn(${anchor.x}, ${anchor.y}, 2.2)`);
  await shot(name, label, `Mid-${label} over the same region, noon, default zoom.`);
}

// ── Winter: mid-winter day, prefer snowfall ──
const winterDay = await page.evaluate(() => {
  let fallback = -1;
  for (let d = __emberfall.day + 1; d < __emberfall.day + 2000; d++) {
    const phase = d % 120;
    if (phase < 95 || phase > 115) continue; // mid-winter only
    if (fallback < 0) fallback = d;
    if (__emberfall.weatherAt(d).kind === 'snow') return d;
  }
  return fallback;
});
await ef(`__emberfall.advanceDays(${winterDay} - __emberfall.day)`);
await page.waitForTimeout(1800);
await ef(`__emberfall.centerOn(${anchor.x}, ${anchor.y}, 2.2)`);
await shot('07-winter', 'winter', 'Mid-winter (snow terrain, snowfall if rolled) over the same region.');

// ── War or crisis: scan forward in 30-day steps until something burns ──
const conflict = await page.evaluate(() => {
  const scan = () => {
    const st = __emberfall.state;
    for (let i = 0; i < st.civs.length; i++) {
      if (!st.civs[i].alive) continue;
      for (let j = i + 1; j < st.civs.length; j++) {
        if (!st.civs[j].alive) continue;
        const r = st.relations[i]?.[j];
        if (r && r.state === 'war') return { type: 'war', a: i, b: j };
      }
    }
    const s = st.settlements.find((t) => t.plagueDays > 0 || t.famineDays > 0);
    return s ? { type: 'crisis', x: s.x, y: s.y, name: s.name } : null;
  };
  let hit = scan();
  let guard = 0;
  while (!hit && guard++ < 130) {
    __emberfall.advanceDays(30);
    hit = scan();
  }
  if (hit && hit.type === 'war') {
    // Frontier midpoint: closest settlement pair across the warring civs.
    const st = __emberfall.state;
    let best = null;
    let bd = Infinity;
    for (const sa of st.settlements) {
      if (sa.civId !== hit.a) continue;
      for (const sb of st.settlements) {
        if (sb.civId !== hit.b) continue;
        const d = (sa.x - sb.x) ** 2 + (sa.y - sb.y) ** 2;
        if (d < bd) {
          bd = d;
          best = { x: (sa.x + sb.x) / 2, y: (sa.y + sb.y) / 2 };
        }
      }
    }
    return { ...hit, ...(best ?? { x: 80, y: 50 }) };
  }
  return hit ?? { type: 'none', x: 80, y: 50 };
});
await page.waitForTimeout(1800);
await ef(`__emberfall.centerOn(${conflict.x}, ${conflict.y}, 2.6)`);
await shot(
  '09-war-crisis',
  'active crisis or war',
  conflict.type === 'war'
    ? 'War frontier between two civilizations: border friction, skirmish markers, military readability.'
    : conflict.type === 'crisis'
      ? `Settlement in crisis (plague/famine): ${conflict.name}.`
      : 'No war or crisis found within the scan window (fallback framing).',
);

manifest.sort((a, b) => a.file.localeCompare(b.file));
fs.writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2));
console.log(`Manifest: ${OUT}/manifest.json`);
console.log(errors.length ? `CONSOLE ERRORS:\n${errors.join('\n')}` : 'no console errors');
console.log(failures.length ? `QA FAILURES:\n${failures.join('\n')}` : 'all QA assertions passed');
await browser.close();
process.exit(errors.length || failures.length ? 1 : 0);
