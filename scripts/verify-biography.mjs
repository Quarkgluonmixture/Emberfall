/* One-off probe: open a civ biography from the inspector and screenshot it. */
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE ?? 'http://localhost:5173';
const OUT = 'scripts/out/play';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));

await page.goto(`${BASE}/?seed=79`, { waitUntil: 'load' });
await page.waitForSelector('#app canvas', { timeout: 20000 });
await page.waitForTimeout(2000);

// Build some history at 20×, then pause.
await page.keyboard.press('3');
await page.waitForTimeout(20000);
await page.keyboard.press('Space');
await page.waitForTimeout(400);

// Open the first civ from the roster, then its biography.
await page.click('#civpanel .civ-row');
await page.waitForTimeout(400);
await page.click('#inspector [data-bio]');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/verify-biography.png` });

const bioText = await page.evaluate(() => {
  const el = document.querySelector('#biography');
  return el && !el.classList.contains('hidden')
    ? el.textContent.trim().slice(0, 600)
    : '(biography panel not visible)';
});
console.log('--- biography ---\n' + bioText);

// Escape closes it.
await page.keyboard.press('Escape');
const closed = await page.evaluate(() =>
  document.querySelector('#biography').classList.contains('hidden'),
);
console.log(`escape closes: ${closed}`);
console.log(errors.length ? `CONSOLE ERRORS:\n${errors.join('\n')}` : 'zero console errors');
await browser.close();
