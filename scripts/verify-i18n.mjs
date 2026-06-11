/* Verify the Esc menu + Chinese localization end to end. */
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
await page.evaluate(() => localStorage.removeItem('emberfall:lang'));
await page.waitForTimeout(2000);

// Let some history accumulate.
await page.keyboard.press('3');
await page.waitForTimeout(6000);
await page.keyboard.press('1');

// 1. Esc opens the menu (English).
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/i18n-menu-en.png` });
console.log('menu visible:', await page.evaluate(() => !document.getElementById('menu').classList.contains('hidden')));

// 2. Switch to Chinese.
await page.click('[data-act="lang-zh"]');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/i18n-menu-zh.png` });

// 3. Close menu, look at HUD/chronicle/civ panel in Chinese.
await page.keyboard.press('Escape');
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/i18n-game-zh.png` });

// 4. Inspect a settlement (click center) and open history.
await page.mouse.click(800, 450);
await page.waitForTimeout(500);
await page.keyboard.press('h');
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/i18n-panels-zh.png` });
const chron = await page.evaluate(() => document.getElementById('chronicle')?.textContent?.slice(0, 200));
console.log('chronicle sample:', chron);

// 5. Esc closes panels first, second Esc opens menu again; fps/debug buttons work.
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await page.click('[data-act="fps"]');
await page.click('[data-act="debug"]');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/i18n-menu-zh-toggles.png` });
console.log('debug visible:', await page.evaluate(() => !document.getElementById('debug').classList.contains('hidden')));

console.log('CONSOLE ERRORS:', errors.length === 0 ? 'none' : '');
for (const e of errors) console.log('  -', e);
await browser.close();
