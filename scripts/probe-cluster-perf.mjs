/*
 * Late-game cluster perf probe: fast-forward to year ~100 (120+ settlements),
 * toggle the debug overlay, sample FPS at mid and far zoom. Needs dev server.
 */
import { chromium } from 'playwright-core';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE ?? 'http://localhost:5174';

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));

await page.goto(`${BASE}/?seed=48&probe=1`, { waitUntil: 'load', timeout: 30000 });
await page.waitForSelector('#app canvas', { timeout: 20000 });
await page.waitForTimeout(2500);
await page.evaluate('__emberfall.setSpeed(0)');
console.log('advancing to year 100…');
await page.evaluate('__emberfall.advanceDays(12000 - __emberfall.day)');
await page.waitForTimeout(3000);

const stats = await page.evaluate(() => {
  const st = __emberfall.state;
  return {
    settlements: st.settlements.length,
    towns: st.settlements.filter((s) => s.tier === 2).length,
    ruins: st.ruins.length,
  };
});
console.log(JSON.stringify(stats));

for (const [label, x, y, z] of [
  ['mid 2.2x', 80, 50, 2.2],
  ['far 1.05x', 80, 50, 1.05],
  ['close 5x', stats ? 80 : 80, 50, 5],
]) {
  await page.evaluate(`__emberfall.centerOn(${x}, ${y}, ${z})`);
  await page.waitForTimeout(2500); // let FPS settle
  const fps = await page.evaluate('Math.round(performance.now() && (window.__fpsProbe ?? 0))');
  // Sample frame rate directly: count rAF ticks over 2s.
  const measured = await page.evaluate(
    () =>
      new Promise((res) => {
        let n = 0;
        const t0 = performance.now();
        const tick = () => {
          n++;
          if (performance.now() - t0 < 2000) requestAnimationFrame(tick);
          else res(Math.round(n / 2));
        };
        requestAnimationFrame(tick);
      }),
  );
  console.log(`${label}: ${measured} fps`);
  void fps;
}

console.log(errors.length ? `CONSOLE ERRORS:\n${errors.join('\n')}` : 'no console errors');
await browser.close();
process.exit(errors.length ? 1 : 0);
