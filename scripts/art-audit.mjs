/*
 * Gemini art audit (`npm run art:audit`): critiques the screenshot battery in
 * docs/art-audit/current/ against docs/art-audit/AUDIT_PROMPT.md and writes
 * the audit to docs/art-audit/GEMINI_ART_AUDIT.md, then distils a ranked
 * checklist into docs/art-audit/GEMINI_ACTION_ITEMS.md.
 * Run `npm run art:shots` first (needs the dev server) to refresh the battery.
 *
 * One gemini call PER SHOT (1 attachment), then a text-only synthesis that
 * produces the scored audit from the grounded per-shot critiques. Never
 * batch the whole battery into one call: past ~a dozen @-attachments the
 * CLI silently drops them all and the model confabulates the critique
 * (2026-06-12 session log has the autopsy; art-review.mjs hit it first).
 */
import fs from 'node:fs';
import { MODEL, runGemini } from './gemini-cli.mjs';

const DIR = 'docs/art-audit';
const SHOTS = `${DIR}/current`;

const promptBody = fs.readFileSync(`${DIR}/AUDIT_PROMPT.md`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${SHOTS}/manifest.json`, 'utf8'));
if (!manifest.length) throw new Error('Empty manifest — run `npm run art:shots` first.');

console.log(`Auditing ${manifest.length} screenshots with ${MODEL} (one call per shot)…`);
const critiques = [];
for (const m of manifest) {
  const text = runGemini(
    `You are an art director and UX readability reviewer for Emberfall, a 2D idle civilization simulation ("civilization aquarium" — the player mostly watches). Below is ONE screenshot from a deterministic play-session battery. Judge it at its intended viewing distance; do not comment on code, review only the visible result, and base every claim ONLY on what you can actually see in this image.

Shot: [${m.label}] ${m.description} (sim day ${m.day}, seed ${m.seed})
Image: @${SHOTS}/${m.file}

In 5-10 blunt, concrete sentences: what reads well, what fails, and the biggest visual blockers in THIS shot. Where relevant to this shot, cover: 2-second comprehension, terrain distinction and beauty, settlement readability/scale, lighting and glow, citizen/action readability, roads/borders/territory readability, UI integration, overall screenshot appeal. Use concrete visual language (colors, sizes, contrast), no generic praise.`,
  );
  critiques.push({ m, text });
  console.log(`  ${m.label}: done`);
}

const critiqueList = critiques
  .map(({ m, text }) => `### [${m.label}] ${m.description} (${m.file})\n${text}`)
  .join('\n\n');

console.log('Synthesizing the full audit…');
const audit = runGemini(
  `${promptBody}

You have already examined every screenshot of the battery one by one; your grounded per-shot critiques are below. Synthesize the full audit (the scores and sections A-H above) STRICTLY from these critiques — do not invent observations they do not support. Where critiques disagree, weigh the close-zoom shots for citizen/settlement detail and the macro shots for map readability.

Per-shot critiques:

${critiqueList}`,
);

const stamp = new Date().toISOString().slice(0, 10);
const header = (title) =>
  `# ${title}\n\n_Model: ${MODEL} · ${stamp} · seed ${manifest[0].seed} · ${manifest.length} shots from \`${SHOTS}/\`, one call per shot_\n\n`;
fs.writeFileSync(
  `${DIR}/GEMINI_ART_AUDIT.md`,
  header('Gemini Art Audit — Emberfall') + critiqueList + '\n\n---\n\n' + audit + '\n',
);
console.log(`Wrote ${DIR}/GEMINI_ART_AUDIT.md`);

console.log('Distilling action items…');
const items = runGemini(
  `Below is an art-direction audit of the game Emberfall. Convert it into a ranked action-item list for the implementation team.

Rules:
- Markdown checklist, ranked by (player impact ÷ implementation effort), highest leverage first.
- Each item: a bold one-line title, the problem in one sentence, the concrete visual fix in 1-3 sentences (exact colors/sizes/alphas where the audit gives them), and an Impact: high/medium/low tag.
- Only include changes to rendering, lighting, scale, color, or composition — no new gameplay or simulation features.
- Merge duplicate complaints into single items. Keep every distinct fix; do not cap the list.

The audit:

${audit}`,
);
fs.writeFileSync(
  `${DIR}/GEMINI_ACTION_ITEMS.md`,
  header('Gemini Action Items — Emberfall') + items + '\n',
);
console.log(`Wrote ${DIR}/GEMINI_ACTION_ITEMS.md (${items.length} chars)`);
