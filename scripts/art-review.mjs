/*
 * Gemini before/after review (`npm run art:review`): compares the shot
 * battery in docs/art-audit/baseline/ (before fixes) against
 * docs/art-audit/current/ (after fixes) pair by pair and writes the verdict
 * to docs/art-audit/GEMINI_REVIEW.md.
 *
 * Workflow: art:shots → copy current/ to baseline/ → art:audit → implement
 * fixes → art:shots again → art:review.
 *
 * Reliability hardening (2026-06-12 session log has both autopsies):
 * - One gemini call PER PAIR (2 attachments). Never batch the battery into
 *   one call: past ~a dozen attachments the CLI drops them all silently.
 * - Per-pair calls can ALSO go silently blind under rate pressure (the model
 *   then invents differences or claims "identical"). Every verdict is
 *   cross-checked against a measured pixel-diff of the pair; conflicting
 *   verdicts are retried once and flagged ⚠ in the report if they persist.
 * - Don't run art:audit and art:review concurrently — parallel CLI sessions
 *   are exactly what triggered the blind calls.
 */
import fs from 'node:fs';
import sharp from 'sharp';
import { MODEL, ensureQuota, runGeminiVerified } from './gemini-cli.mjs';

await ensureQuota();

/** Token-evidence gate: the CLI's system preamble is ~10.7k tokens and each
    attached image adds ~1130 prompt tokens (calibrated 2026-06-12). A call
    whose prompt tokens land near the bare-text size never saw the images. */
function sawMedia(v, promptText, nImages) {
  return v.promptTokens >= 10400 + promptText.length / 5 + nImages * 700;
}

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

/** Fraction of pixels whose any-channel delta exceeds 8 (JPEG-noise floor). */
async function pixelDiff(fileA, fileB) {
  const a = await sharp(fileA).raw().toBuffer({ resolveWithObject: true });
  const b = await sharp(fileB).raw().toBuffer({ resolveWithObject: true });
  if (a.data.length !== b.data.length) return 1;
  let changed = 0;
  const px = a.data.length / a.info.channels;
  for (let i = 0; i < px; i++) {
    const o = i * a.info.channels;
    for (let c = 0; c < 3; c++) {
      if (Math.abs(a.data[o + c] - b.data[o + c]) > 8) {
        changed++;
        break;
      }
    }
  }
  return changed / px;
}

/** A verdict that contradicts the measured diff is probably a blind call. */
function suspect(text, diff) {
  const head = text.slice(0, 300).toLowerCase();
  const saysSame = /unchanged|no visible|identical|zero pixel|exactly the same/.test(head);
  const saysDiff = /^(improved|regressed)/.test(head.trim());
  if (diff >= 0.005 && saysSame)
    return `claims unchanged but ${(diff * 100).toFixed(1)}% of pixels differ`;
  if (diff < 0.0005 && saysDiff)
    return `claims a change but only ${(diff * 100).toFixed(2)}% of pixels differ`;
  return null;
}

console.log(`Reviewing ${pairs.length} before/after pairs with ${MODEL} (one call per pair)…`);
const verdicts = [];
for (const p of pairs) {
  const diff = await pixelDiff(`${BEFORE}/${p.b.file}`, `${AFTER}/${p.a.file}`);
  const prompt = `You are an art director reviewing one shot from a deterministic before/after screenshot battery of the 2D idle civilization game Emberfall (same seed, same sim day, same camera in both images).

Shot: ${p.b.label} — ${p.b.description}
BEFORE: @${BEFORE}/${p.b.file}
AFTER: @${AFTER}/${p.a.file}

First word of your reply: Improved / Regressed / Unchanged. Then 1-3 sentences: what visibly differs between the two images, and whether it helps the player. Base every claim ONLY on pixel differences you can actually see — the pass may be narrow, and "Unchanged" is a perfectly good answer. Be blunt about regressions.`;

  // Up to 3 attempts to get a call that provably received both images
  // (token evidence), then cross-check the verdict against the pixel diff.
  let v = null;
  let blind = true;
  for (let attempt = 0; attempt < 3 && blind; attempt++) {
    v = runGeminiVerified(prompt);
    blind = v.model !== MODEL || !sawMedia(v, prompt, 2);
    if (blind) {
      console.log(
        `  ${p.b.label}: blind call (model ${v.model}, ${v.promptTokens} prompt tokens, ${v.seconds.toFixed(1)}s) — retrying…`,
      );
    }
  }
  let text = v.text;
  let warn = blind
    ? `model never received the images (${v.promptTokens} prompt tokens after 3 attempts)`
    : suspect(text, diff);
  if (warn && !blind) {
    console.log(`  ${p.b.label}: verdict suspect (${warn}) — retrying once…`);
    const r = runGeminiVerified(prompt);
    if (r.model === MODEL && sawMedia(r, prompt, 2)) {
      text = r.text;
      warn = suspect(text, diff);
    }
  }
  verdicts.push({ label: p.b.label, file: p.b.file, text, diff, warn, blind });
  console.log(
    `  ${p.b.label}: ${text.split(/\s/, 1)[0]} (diff ${(diff * 100).toFixed(1)}%, ${v.promptTokens}tok, ${v.seconds.toFixed(0)}s${warn ? ' ⚠' : ''})`,
  );
}

const verdictList = verdicts
  .map(
    (v) =>
      `### ${v.label} (${v.file}) — ${(v.diff * 100).toFixed(1)}% pixels differ${
        v.warn
          ? `\n> ⚠ UNRELIABLE VERDICT: ${v.warn} (likely a blind call — attachments dropped)`
          : ''
      }\n${v.text}`,
  )
  .join('\n\n');

console.log('Synthesizing overall verdict…');
const reliable = verdicts.filter((v) => !v.warn);
const synthesis = runGemini(
  `You are an art director. Below are your own per-shot verdicts from a before/after screenshot review of the 2D idle civilization game Emberfall, each with the measured fraction of changed pixels. Verdicts marked UNRELIABLE were produced without seeing the images — ignore their claims entirely. Using ONLY the reliable verdicts (no other assumptions about what the team intended), write:

1. An overall verdict paragraph: did the pass meaningfully improve visual quality and readability? Any regressions?
2. The top 3 remaining problems for a future pass, judged from what the verdicts say is still weak.

Do not invent changes that the verdicts do not mention.

${verdicts
  .map(
    (v) =>
      `### ${v.label} — ${(v.diff * 100).toFixed(1)}% pixels differ${v.warn ? ' [UNRELIABLE]' : ''}\n${v.text}`,
  )
  .join('\n\n')}`,
);

const stamp = new Date().toISOString().slice(0, 10);
fs.writeFileSync(
  `${DIR}/GEMINI_REVIEW.md`,
  `# Gemini Before/After Review — Emberfall\n\n_Model: ${MODEL} · ${stamp} · ${pairs.length} pairs (baseline vs current), one call per pair, ${reliable.length}/${verdicts.length} verdicts passed the pixel-diff cross-check_\n\n${verdictList}\n\n---\n\n${synthesis}\n`,
);
console.log(`Wrote ${DIR}/GEMINI_REVIEW.md (${reliable.length}/${verdicts.length} reliable)`);
