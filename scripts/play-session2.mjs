/* Play session 2: proper zoom-in, settlement inspection, citizens close-up. */
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

await page.goto(`${BASE}/?seed=48`, { waitUntil: 'load' });
await page.waitForSelector('#app canvas', { timeout: 20000 });
await page.waitForTimeout(2500);

// Fast-forward ~10 years so towns exist.
await page.keyboard.press('3');
await page.waitForTimeout(20000);
await page.keyboard.press('1');
await page.waitForTimeout(500);

// Zoom IN with mouse over the canvas center (a settlement cluster is mid-map).
await page.mouse.move(800, 450);
for (let i = 0; i < 8; i++) {
  await page.mouse.wheel(0, -240);
  await page.waitForTimeout(150);
}
await page.waitForTimeout(1500);
await shot('10-close-settlement');

// One more zoom level for citizen detail.
for (let i = 0; i < 4; i++) {
  await page.mouse.wheel(0, -240);
  await page.waitForTimeout(150);
}
await page.waitForTimeout(1500);
await shot('11-citizen-detail');

// Let time run at 1x for a bit at this zoom to watch citizens animate.
await page.waitForTimeout(4000);
await shot('12-citizen-detail-later');

// Click on the settlement label area to inspect a settlement.
await page.mouse.click(800, 450);
await page.waitForTimeout(600);
await shot('13-settlement-inspect');
const insp = await page.evaluate(() => document.querySelector('#inspector')?.textContent?.trim()?.slice(0, 500) ?? '');
console.log('--- inspector ---\n' + insp);

// Open civ roster panel by clicking first civ row, if clickable.
const civRow = await page.locator('#civpanel .civ-row, .civ-list .row, #civs li').first();
if (await civRow.count()) {
  await civRow.click();
  await page.waitForTimeout(600);
  await shot('14-civ-panel');
  const civText = await page.evaluate(() => document.querySelector('#inspector')?.textContent?.trim()?.slice(0, 600) ?? '');
  console.log('--- civ inspect ---\n' + civText);
}

// Zoom out to medium for a "playing view".
await page.mouse.move(800, 450);
for (let i = 0; i < 5; i++) {
  await page.mouse.wheel(0, 240);
  await page.waitForTimeout(150);
}
await page.waitForTimeout(1200);
await shot('15-medium-view');

console.log('CONSOLE ERRORS:', errors.length === 0 ? 'none' : '');
for (const e of errors) console.log('  -', e);
await browser.close();
