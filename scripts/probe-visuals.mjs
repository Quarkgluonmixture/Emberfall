/**
 * Visual probe for the river bend/mouth tiles and wildfire flame FX.
 * Needs the dev server on :5173. Seed 1337 facts (probe-river/fire/setts):
 * bends cluster at (63-66,40-42), mouth at (37,52), first wildfire day 1132
 * at (93,15). Boot camera centers on the first capital Fernford (58,56) at
 * zoom 2.2 with a 1600×900 viewport.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT = 'scripts/out';
fs.mkdirSync(OUT, { recursive: true });

const CAM = [(58 + 0.5) * 8, (56 + 0.5) * 8];
const screenOf = (tx, ty) => [
  ((tx + 0.5) * 8 - CAM[0]) * 2.2 + 800,
  ((ty + 0.5) * 8 - CAM[1]) * 2.2 + 450,
];

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));

async function boot() {
  await page.goto('http://localhost:5173', { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('#app canvas', { timeout: 20000 });
  await page.waitForTimeout(2500);
}

async function zoomAt(x, y, steps) {
  await page.mouse.move(x, y);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, -120);
    await page.waitForTimeout(70);
  }
  await page.waitForTimeout(600);
}

// 1. Wide boot view.
await boot();
await page.keyboard.press('Space'); // pause so nothing moves between shots
await page.screenshot({ path: `${OUT}/river-wide.png` });

// 2. Bend cluster around tile (64.5,41).
const [bx, by] = screenOf(64.5, 41);
await zoomAt(bx, by, 10);
await page.screenshot({ path: `${OUT}/river-bend.png` });

// 3. River mouth at (37,52).
await boot();
await page.keyboard.press('Space');
const [mx, my] = screenOf(37, 52);
await zoomAt(mx, my, 10);
await page.screenshot({ path: `${OUT}/river-mouth.png` });

// 4. Wildfire flames: pause, frame tile (93,15), then run at 20× to day 1132.
await boot();
await page.keyboard.press('Space');
const [fx, fy] = screenOf(93, 15); // fy is off-screen top: drag the map down first
await page.mouse.move(800, 200);
await page.mouse.down();
await page.mouse.move(800, 560, { steps: 10 });
await page.mouse.up();
await zoomAt(fx, fy + 360, 6);
await page.keyboard.press('3'); // unpause straight into 20× (40 days/s)
// Boot ran ~2.5s at 1× before the pause → ~day 5. (1132 - 5) / 40 ≈ 28.2s.
await page.waitForTimeout(28600);
await page.screenshot({ path: `${OUT}/wildfire-1.png` });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}/wildfire-2.png` });

console.log(errors.length ? `CONSOLE ERRORS:\n${errors.join('\n')}` : 'no console errors');
await browser.close();
