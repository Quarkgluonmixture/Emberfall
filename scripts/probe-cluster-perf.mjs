/*
 * Late-game cluster perf probe: fast-forward to year ~100 (120+ settlements),
 * toggle the debug overlay, sample FPS at mid and far zoom. Needs dev server.
 */
import { launchGame } from './lib/browser.mjs';

const game = await launchGame({ seed: 48 });
const { page } = game;
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

const errorCount = await game.close();
process.exit(errorCount ? 1 : 0);
