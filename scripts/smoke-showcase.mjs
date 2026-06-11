/* Showcase verification: attract mode tour, world story overlay, stress mode. */
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT = 'scripts/out';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));

// 1. Attract mode tour on a curated seed.
await page.goto('http://localhost:5173/?seed=48&attract=1', { waitUntil: 'load' });
await page.waitForSelector('#app canvas', { timeout: 20000 });
await page.keyboard.press('3'); // exits attract (any key) but speeds time
await page.keyboard.press('a'); // re-enter attract at 20x
await page.waitForTimeout(8000);
await page.screenshot({ path: `${OUT}/attract-1.png` });
await page.waitForTimeout(10000);
await page.screenshot({ path: `${OUT}/attract-2.png` });
const cinemaOn = await page.evaluate(() => document.body.classList.contains('cinema'));
const storyText = await page.locator('#worldstory').textContent();
console.log('cinema mode during attract:', cinemaOn);
console.log('world story:', (storyText ?? '').trim().slice(0, 160));

// Mouse input exits attract.
await page.mouse.move(800, 450);
await page.mouse.down();
await page.mouse.move(850, 470);
await page.mouse.up();
await page.waitForTimeout(400);
const cinemaAfter = await page.evaluate(() => document.body.classList.contains('cinema'));
console.log('cinema after user input (should be false):', cinemaAfter);

// 2. Seed gallery renders.
await page.keyboard.press('g');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/gallery.png` });
const cards = await page.locator('.seed-card').count();
console.log('gallery cards:', cards);
await page.keyboard.press('Escape');

// 3. Stress mode.
await page.goto('http://localhost:5173/?seed=7&stress=1', { waitUntil: 'load' });
await page.waitForSelector('#app canvas', { timeout: 20000 });
await page.waitForTimeout(20000); // 2 × 100 years
const debugText = await page.locator('#debug').textContent();
console.log('--- stress report ---');
console.log((debugText ?? '').split('active systems')[1] ?? debugText);

console.log('CONSOLE ERRORS:', errors.length === 0 ? 'none' : '');
for (const e of errors) console.log('  -', e);
await browser.close();
