/*
 * Gemini SFX audition (`node scripts/sfx-audition.mjs`): plays each staged
 * candidate in docs/sfx-audition/ to Gemini and asks for a fit verdict
 * against its Emberfall event slot. Pure advisory — the owner's ears decide.
 *
 * Evidence rules (2026-06-12 autopsies): verify the served model and the
 * prompt-token count on every call; near-quota the CLI silently drops
 * attachments and the model confabulates a review from the filename. A
 * TerminalQuotaError aborts the run — wait for the quota window to reset
 * instead of burning retries.
 */
import fs from 'node:fs';
import { MODEL, ensureQuota, runGeminiVerified } from './gemini-cli.mjs';

await ensureQuota();

const DIR = 'docs/sfx-audition';
// candidate file → the event slot it would fill.
const SLOTS = JSON.parse(fs.readFileSync(`${DIR}/slots.json`, 'utf8'));

console.log(`Auditioning ${Object.keys(SLOTS).length} samples with ${MODEL}…`);
const results = [];
for (const [file, slot] of Object.entries(SLOTS)) {
  if (!fs.existsSync(`${DIR}/${file}`)) {
    console.warn(`  missing ${file} — skipped`);
    continue;
  }
  const prompt = `You are the audio director of Emberfall, a cozy dark-fantasy idle civilization game (painterly, muted, medieval — NOT a casual mobile game). Listen to this sound effect candidate for the event: "${slot}".

Audio: @${DIR}/${file}

Reply in exactly this format:
FIT: <1-10> — <one sentence: does the character/mood suit the event and the cozy dark-fantasy tone?>
SOUND: <one sentence: what it actually sounds like — instrument, pitch, length, any artifacts or "cheap casual game" feel>`;
  let v;
  try {
    v = runGeminiVerified(prompt);
  } catch (e) {
    if (/quota/i.test(String(e))) {
      console.error('Quota exhausted — stop and rerun after the reset window.');
      break;
    }
    throw e;
  }
  // Audio adds few tokens (~32/s); the gate mainly catches degraded calls
  // whose preamble shrinks below the normal floor.
  const blind = v.model !== MODEL || v.promptTokens < 10400 + prompt.length / 5;
  results.push({ file, slot, text: v.text, blind });
  console.log(
    `\n── ${file} (${v.model}, ${v.seconds.toFixed(0)}s, ${v.promptTokens}tok${blind ? ' ⚠ BLIND' : ''})`,
  );
  console.log(v.text);
}

fs.writeFileSync(
  `${DIR}/VERDICTS.md`,
  `# SFX audition — ${new Date().toISOString().slice(0, 10)}\n\n${results
    .map(
      (r) =>
        `## ${r.file}\nSlot: ${r.slot}${r.blind ? '\n> ⚠ BLIND CALL — ignore' : ''}\n${r.text}`,
    )
    .join('\n\n')}\n`,
);
console.log(`\nWrote ${DIR}/VERDICTS.md`);
