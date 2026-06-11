/* Play session 3: daytime close-zoom probe — is the glow washout night-only? */
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

// Fast-forward a few years.
await page.keyboard.press('3');
await page.waitForTimeout(10000);
await page.keyboard.press('1');

// Zoom in close on center.
await page.mouse.move(800, 450);
for (let i = 0; i < 10; i++) {
  await page.mouse.wheel(0, -240);
  await page.waitForTimeout(120);
}
await page.waitForTimeout(1000);

// Sample screenshots across the day/season cycle at 1x: every 5s for 60s,
// log the HUD date so we can find a bright daytime frame.
for (let i = 0; i < 12; i++) {
  const label = await page.evaluate(() => document.querySelector('#hud-date, .hud-date, #date')?.textContent?.trim() ?? document.title);
  console.log(`t+${i * 5}s:`, label);
  await shot(`20-cycle-${String(i).padStart(2, '0')}`);
  await page.waitForTimeout(5000);
}

console.log('CONSOLE ERRORS:', errors.length === 0 ? 'none' : '');
for (const e of errors) console.log('  -', e);
await browser.close();
