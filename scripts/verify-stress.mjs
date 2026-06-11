/* Stress determinism check after sim changes (rebirth + roads). */
import { chromium } from 'playwright-core';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE ?? 'http://localhost:5174';

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));

await page.goto(`${BASE}/?seed=7&stress=1`, { waitUntil: 'load' });
await page.waitForSelector('#app canvas', { timeout: 20000 });
await page.waitForTimeout(30000);
const debugText = await page.locator('#debug').textContent();
console.log((debugText ?? '').split('active systems')[1] ?? debugText);
console.log('CONSOLE ERRORS:', errors.length === 0 ? 'none' : '');
for (const e of errors) console.log('  -', e);
await browser.close();
