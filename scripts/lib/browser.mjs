/*
 * Shared Playwright boilerplate for headless probes and batteries.
 * Standard usage:
 *
 *   import { launchGame } from './lib/browser.mjs';
 *   const g = await launchGame({ seed: 48 });
 *   await g.page.evaluate('__emberfall.advanceDays(600)');
 *   ...
 *   await g.close(); // prints console errors, returns their count
 *
 * BASE env overrides the port; otherwise 5173-5175 are probed (Vite drifts
 * when older instances hold a port — see CLAUDE.md).
 */
import { chromium } from 'playwright-core';

export const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

export async function detectBase() {
  if (process.env.BASE) return process.env.BASE;
  for (const port of [5173, 5174, 5175]) {
    try {
      const res = await fetch(`http://localhost:${port}/`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) return `http://localhost:${port}`;
    } catch {
      /* next port */
    }
  }
  throw new Error('No dev server found on 5173-5175. Run `npm run dev` first.');
}

/**
 * Launch headless Edge, open the game (with ?probe=1 unless probe: false),
 * wait for the canvas, and collect console/page errors.
 */
export async function launchGame({ seed = 48, probe = true, params = '', viewport } = {}) {
  const base = await detectBase();
  const browser = await chromium.launch({ executablePath: EDGE, headless: true });
  const page = await browser.newPage({
    viewport: viewport ?? { width: 1600, height: 900 },
  });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));

  const query = [`seed=${seed}`, probe ? 'probe=1' : '', params].filter(Boolean).join('&');
  await page.goto(`${base}/?${query}`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('#app canvas', { timeout: 20000 });
  await page.waitForTimeout(2500);

  return {
    base,
    browser,
    page,
    errors,
    /** Close the browser; logs and returns the number of console errors. */
    async close() {
      console.log(errors.length ? `CONSOLE ERRORS:\n${errors.join('\n')}` : 'no console errors');
      await browser.close();
      return errors.length;
    },
  };
}
