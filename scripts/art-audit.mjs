/*
 * Gemini art audit (`npm run art:audit`): sends the screenshot battery in
 * docs/art-audit/current/ plus docs/art-audit/AUDIT_PROMPT.md to Gemini and
 * writes the critique to docs/art-audit/GEMINI_ART_AUDIT.md, then distils a
 * ranked checklist into docs/art-audit/GEMINI_ACTION_ITEMS.md.
 * Run `npm run art:shots` first (needs the dev server) to refresh the battery.
 */
import fs from 'node:fs';
import { MODEL, runGemini } from './gemini-cli.mjs';

const DIR = 'docs/art-audit';
const SHOTS = `${DIR}/current`;

const promptBody = fs.readFileSync(`${DIR}/AUDIT_PROMPT.md`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${SHOTS}/manifest.json`, 'utf8'));
if (!manifest.length) throw new Error('Empty manifest — run `npm run art:shots` first.');

const shotList = manifest
  .map((m) => `- @${SHOTS}/${m.file} — [${m.label}] ${m.description} (sim day ${m.day}, seed ${m.seed})`)
  .join('\n');

console.log(`Auditing ${manifest.length} screenshots with ${MODEL}…`);
const audit = runGemini(
  `${promptBody}\n\nThe screenshots, captured from one deterministic play session:\n${shotList}\n\nAll zoom levels named above (macro / mid / close) are real zoom levels the player uses constantly; judge each shot at its intended viewing distance.`,
);

const stamp = new Date().toISOString().slice(0, 10);
const header = (title) =>
  `# ${title}\n\n_Model: ${MODEL} · ${stamp} · seed ${manifest[0].seed} · ${manifest.length} shots from \`${SHOTS}/\`_\n\n`;
fs.writeFileSync(`${DIR}/GEMINI_ART_AUDIT.md`, header('Gemini Art Audit — Emberfall') + audit + '\n');
console.log(`Wrote ${DIR}/GEMINI_ART_AUDIT.md (${audit.length} chars)`);

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
fs.writeFileSync(`${DIR}/GEMINI_ACTION_ITEMS.md`, header('Gemini Action Items — Emberfall') + items + '\n');
console.log(`Wrote ${DIR}/GEMINI_ACTION_ITEMS.md (${items.length} chars)`);
