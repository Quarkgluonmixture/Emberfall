/*
 * Gemini before/after review (`npm run art:review`): compares the shot
 * battery in docs/art-audit/baseline/ (before fixes) against
 * docs/art-audit/current/ (after fixes) pair by pair and writes the verdict
 * to docs/art-audit/GEMINI_REVIEW.md.
 *
 * Workflow: art:shots → copy current/ to baseline/ → art:audit → implement
 * fixes → art:shots again → art:review.
 */
import fs from 'node:fs';
import { MODEL, runGemini } from './gemini-cli.mjs';

const DIR = 'docs/art-audit';
const BEFORE = `${DIR}/baseline`;
const AFTER = `${DIR}/current`;

const before = JSON.parse(fs.readFileSync(`${BEFORE}/manifest.json`, 'utf8'));
const after = JSON.parse(fs.readFileSync(`${AFTER}/manifest.json`, 'utf8'));
const pairs = before
  .map((b) => ({ b, a: after.find((a) => a.file === b.file) }))
  .filter((p) => p.a && fs.existsSync(`${BEFORE}/${p.b.file}`) && fs.existsSync(`${AFTER}/${p.a.file}`));
if (!pairs.length) throw new Error(`No matching shot pairs between ${BEFORE} and ${AFTER}.`);

const pairList = pairs
  .map(
    (p) =>
      `### ${p.b.label} (${p.b.file})\n${p.b.description}\nBEFORE: @${BEFORE}/${p.b.file}\nAFTER: @${AFTER}/${p.a.file}`,
  )
  .join('\n\n');

console.log(`Reviewing ${pairs.length} before/after pairs with ${MODEL}…`);
const review = runGemini(
  `You are the same art director who audited the 2D idle civilization game Emberfall. The team implemented a readability pass. Below are BEFORE and AFTER screenshots for each shot of the deterministic battery (same seed, same sim day, same camera).

For each pair, state: improved / regressed / unchanged, and in 1-3 sentences what specifically changed on screen and whether it helped the player.

Then finish with:
1. An overall verdict paragraph: did the pass meaningfully improve visual hierarchy and readability?
2. Re-score the same 13 categories from the original audit (1-10), marking the delta for any category that moved.
3. The top 3 remaining problems for a future pass.

Be blunt; call out regressions explicitly.

${pairList}`,
);

const stamp = new Date().toISOString().slice(0, 10);
fs.writeFileSync(
  `${DIR}/GEMINI_REVIEW.md`,
  `# Gemini Before/After Review — Emberfall\n\n_Model: ${MODEL} · ${stamp} · ${pairs.length} pairs (baseline vs current)_\n\n${review}\n`,
);
console.log(`Wrote ${DIR}/GEMINI_REVIEW.md (${review.length} chars)`);
