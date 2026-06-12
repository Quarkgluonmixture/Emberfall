/*
 * Gemini before/after review (`npm run art:review`): compares the shot
 * battery in docs/art-audit/baseline/ (before fixes) against
 * docs/art-audit/current/ (after fixes) pair by pair and writes the verdict
 * to docs/art-audit/GEMINI_REVIEW.md.
 *
 * Workflow: art:shots → copy current/ to baseline/ → art:audit → implement
 * fixes → art:shots again → art:review.
 *
 * One gemini call PER PAIR (2 attachments), then a text-only synthesis call.
 * Never batch many @-attachments into one call: past ~a dozen images the CLI
 * silently drops them all and the model "reviews" from the brief alone —
 * confidently, and in both directions (2026-06-12 session log has the
 * autopsy). Two attachments per call is verified reliable.
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
  .filter(
    (p) => p.a && fs.existsSync(`${BEFORE}/${p.b.file}`) && fs.existsSync(`${AFTER}/${p.a.file}`),
  );
if (!pairs.length) throw new Error(`No matching shot pairs between ${BEFORE} and ${AFTER}.`);

console.log(`Reviewing ${pairs.length} before/after pairs with ${MODEL} (one call per pair)…`);
const verdicts = [];
for (const p of pairs) {
  const text = runGemini(
    `You are an art director reviewing one shot from a deterministic before/after screenshot battery of the 2D idle civilization game Emberfall (same seed, same sim day, same camera in both images).

Shot: ${p.b.label} — ${p.b.description}
BEFORE: @${BEFORE}/${p.b.file}
AFTER: @${AFTER}/${p.a.file}

First word of your reply: Improved / Regressed / Unchanged. Then 1-3 sentences: what visibly differs between the two images, and whether it helps the player. Base every claim ONLY on pixel differences you can actually see — the pass may be narrow, and "Unchanged" is a perfectly good answer. Be blunt about regressions.`,
  );
  verdicts.push({ label: p.b.label, file: p.b.file, text });
  console.log(`  ${p.b.label}: ${text.split(/\s/, 1)[0]}`);
}

const verdictList = verdicts.map((v) => `### ${v.label} (${v.file})\n${v.text}`).join('\n\n');

console.log('Synthesizing overall verdict…');
const synthesis = runGemini(
  `You are an art director. Below are your own per-shot verdicts from a before/after screenshot review of the 2D idle civilization game Emberfall. Using ONLY these verdicts (no other assumptions about what the team intended), write:

1. An overall verdict paragraph: did the pass meaningfully improve visual quality and readability? Any regressions?
2. The top 3 remaining problems for a future pass, judged from what the verdicts say is still weak.

Do not invent changes that the verdicts do not mention.

${verdictList}`,
);

const stamp = new Date().toISOString().slice(0, 10);
fs.writeFileSync(
  `${DIR}/GEMINI_REVIEW.md`,
  `# Gemini Before/After Review — Emberfall\n\n_Model: ${MODEL} · ${stamp} · ${pairs.length} pairs (baseline vs current), one call per pair_\n\n${verdictList}\n\n---\n\n${synthesis}\n`,
);
console.log(`Wrote ${DIR}/GEMINI_REVIEW.md`);
