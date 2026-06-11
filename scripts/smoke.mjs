/* Headless browser smoke test: boots the game, screenshots, runs at 20x. */
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT = 'scripts/out';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(`PAGEERROR: ${err.message}`));

await page.goto('http://localhost:5173', { waitUntil: 'load', timeout: 30000 });
await page.waitForSelector('#app canvas', { timeout: 20000 });
await page.waitForTimeout(3000); // let the first frames render
await page.screenshot({ path: `${OUT}/boot.png` });

// Crank to 20x and let a few in-game years pass.
await page.keyboard.press('3');
await page.waitForTimeout(9000);
await page.screenshot({ path: `${OUT}/running-20x.png` });

// Zoom in toward the center to see citizens (wheel up on canvas center).
await page.mouse.move(800, 450);
for (let i = 0; i < 12; i++) {
  await page.mouse.wheel(0, -120);
  await page.waitForTimeout(80);
}
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/zoomed.png` });

// Open history panel and debug overlay.
await page.keyboard.press('h');
await page.keyboard.press('F3');
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/panels.png` });

const debugText = await page.locator('#debug').textContent().catch(() => '(no debug)');
console.log('DEBUG OVERLAY:\n' + debugText);
console.log('CONSOLE ERRORS:', errors.length === 0 ? 'none' : '');
for (const e of errors) console.log('  -', e);

await browser.close();
