/* Manual play session: drive the game like a player and capture screenshots. */
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE ?? 'http://localhost:5175';
const OUT = 'scripts/out/play';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));

const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });

// --- Boot a curated seed, look at the fresh world ---
await page.goto(`${BASE}/?seed=48`, { waitUntil: 'load' });
await page.waitForSelector('#app canvas', { timeout: 20000 });
await page.waitForTimeout(3000);
await shot('01-fresh-world');

// --- Run at max speed for a while, watch the world develop ---
await page.keyboard.press('3');
await page.waitForTimeout(15000);
await page.keyboard.press('1');
await page.waitForTimeout(500);
await shot('02-after-fastforward');

// --- Zoom in on the center for a close look at a settlement/citizens ---
for (let i = 0; i < 6; i++) {
  await page.mouse.wheel(0, -240);
  await page.waitForTimeout(120);
}
await page.waitForTimeout(1200);
await shot('03-zoomed-in');

// --- Click around the center to inspect something ---
await page.mouse.click(800, 450);
await page.waitForTimeout(600);
await shot('04-inspector-click');
const inspectorText = await page.evaluate(() => {
  const el = document.querySelector('#inspector');
  return el ? el.textContent.trim().slice(0, 400) : '(no #inspector element)';
});
console.log('--- inspector ---\n' + inspectorText);

// --- Zoom back out, mid view ---
for (let i = 0; i < 4; i++) {
  await page.mouse.wheel(0, 240);
  await page.waitForTimeout(120);
}
await page.waitForTimeout(800);
await shot('05-mid-zoom');

// --- History panel ---
await page.keyboard.press('h');
await page.waitForTimeout(500);
await shot('06-history');
await page.keyboard.press('h');

// --- World story overlay ---
await page.keyboard.press('w');
await page.waitForTimeout(500);
await shot('07-worldstory');
const story = await page.evaluate(() => document.querySelector('#worldstory')?.textContent?.trim() ?? '');
console.log('--- world story ---\n' + story.slice(0, 600));
await page.keyboard.press('Escape');

// --- Chronicle text (whatever panel shows it) ---
const chron = await page.evaluate(() => {
  const el = document.querySelector('#chronicle') ?? document.querySelector('.chronicle');
  return el ? el.textContent.trim().slice(0, 800) : '(no chronicle element found)';
});
console.log('--- chronicle ---\n' + chron);

// --- Run longer at 20x to see late-game state and events ---
await page.keyboard.press('3');
await page.waitForTimeout(25000);
await page.keyboard.press('1');
await page.waitForTimeout(500);
await shot('08-late-game');

// --- Attract mode for two shots ---
await page.keyboard.press('a');
await page.waitForTimeout(9000);
await shot('09-attract');

// --- Final state dump ---
const hudText = await page.evaluate(() => document.querySelector('#hud')?.textContent?.trim()?.slice(0, 300) ?? '');
console.log('--- hud ---\n' + hudText);
console.log('CONSOLE ERRORS:', errors.length === 0 ? 'none' : '');
for (const e of errors) console.log('  -', e);
await browser.close();
