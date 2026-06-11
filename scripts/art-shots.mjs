/*
 * Art-review screenshot battery. Exploits deterministic timing:
 * ambient starts 0.35 (bright) and advances 1/45 per real second at 1x
 * (3/45 at 20x); a season is 30 days; 1x = 2 days/s, 20x = 40 days/s.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE ?? 'http://localhost:5174';
const OUT = 'scripts/out/art';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });

const boot = async () => {
  await page.goto(`${BASE}/?seed=48`, { waitUntil: 'load' });
  await page.waitForSelector('#app canvas', { timeout: 20000 });
  await page.waitForTimeout(1800);
};

// ── Pass 1: four seasons, daytime, default zoom ──
await boot();
await shot('season-0-spring');
// 20x bursts to hop one season (30 days = 0.75s), then settle at 1x.
const hopSeason = async (ms) => {
  await page.keyboard.press('3');
  await page.waitForTimeout(ms);
  await page.keyboard.press('1');
  await page.waitForTimeout(700);
};
await hopSeason(900);
await shot('season-1-summer');
await hopSeason(800);
await shot('season-2-autumn');
await hopSeason(800);
await shot('season-3-winter');

// ── Pass 2: season boundary sequence (fresh boot, hop to day ~27) ──
await boot();
await page.keyboard.press('3');
await page.waitForTimeout(650); // ~day 26
await page.keyboard.press('1');
for (let i = 0; i < 6; i++) {
  await shot(`boundary-${i}`); // 2 days/s → flips to summer within these frames
  await page.waitForTimeout(700);
}

// ── Pass 3: dusk → night progression (fresh boot, 1x throughout) ──
await boot(); // t≈2s, ambient≈0.39
await page.waitForTimeout(10000); // t≈12s, ambient≈0.62 late afternoon
for (let i = 0; i < 7; i++) {
  await shot(`dusk-${i}`); // every 4s: 0.62 → 0.62+6*4/45≈1.15 (deep night → past midnight)
  await page.waitForTimeout(4000);
}

console.log('CONSOLE ERRORS:', errors.length === 0 ? 'none' : '');
for (const e of errors) console.log('  -', e);
await browser.close();
