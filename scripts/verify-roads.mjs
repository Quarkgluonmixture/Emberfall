/* Verify roads + tile-variant equalization: catch a bright daytime mid-zoom frame. */
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE ?? 'http://localhost:5174';
const OUT = 'scripts/out/play';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));

await page.goto(`${BASE}/?seed=48`, { waitUntil: 'load' });
await page.waitForSelector('#app canvas', { timeout: 20000 });
await page.waitForTimeout(2500);

// ~10 game-years at 20x so trade opens and the road network grows.
await page.keyboard.press('3');
await page.waitForTimeout(25000);
await page.keyboard.press('1');

// Mid zoom over the capital cluster.
await page.mouse.move(800, 450);
for (let i = 0; i < 4; i++) {
  await page.mouse.wheel(0, -240);
  await page.waitForTimeout(120);
}

// Sample one full ambient cycle; keep day frames by name.
for (let i = 0; i < 10; i++) {
  await page.screenshot({ path: `${OUT}/verify-${String(i).padStart(2, '0')}.png` });
  await page.waitForTimeout(5000);
}
console.log('CONSOLE ERRORS:', errors.length === 0 ? 'none' : '');
for (const e of errors) console.log('  -', e);
await browser.close();
