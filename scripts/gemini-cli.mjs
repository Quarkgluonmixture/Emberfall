/*
 * Shared gemini CLI invocation for the art-audit scripts.
 *
 * Hard-won invocation rules (see CHECKPOINT.md art grading session):
 * - Must run under Node 22 (C:\tools\node22\node.exe) — system Node 18 crashes the CLI.
 * - Pass -m explicitly; 3.x models need the `-preview` suffix. Misspelled names
 *   silently degrade to 2.5-pro.
 * - `--output-format json` + parsing `.response` is the only clean extraction;
 *   bare `-p > out.md` pollutes the output with conversational fragments.
 * - Never put output file paths inside the prompt (gemini write_file's them itself).
 * - `@path` attachments matching .gitignore are refused — keep audit images in docs/.
 * - Batching many @-attachments in one call fails SILENTLY (~a dozen+ images →
 *   none attached, the model confabulates a review from the prompt alone).
 *   Keep it to a couple of images per call; loop for batteries (see art-review).
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const NODE22 = 'C:\\tools\\node22\\node.exe';
const GEMINI_JS = path.join(
  process.env.APPDATA ?? '',
  'npm',
  'node_modules',
  '@google',
  'gemini-cli',
  'bundle',
  'gemini.js',
);
export const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.1-pro-preview';

/** Run gemini with a prompt (may contain @file attachments); returns the response text.
    `runGeminiVerified` additionally returns hard evidence that the call was real. */
export function runGemini(prompt, opts = {}) {
  return runGeminiVerified(prompt, opts).text;
}

/**
 * Like runGemini, but returns { text, model, seconds, promptTokens, evidence }.
 * Use the evidence to detect SILENT degradation:
 * - `model` must be the requested one (misroutes degrade quietly);
 * - `promptTokens` must be far above the text-only size when media is
 *   attached (each image is ~250-1000 tokens; a media call that comes back
 *   near the bare-prompt token count never saw the attachments);
 * - `seconds`: sub-couple-of-seconds responses to multi-image prompts are
 *   another blind-call tell.
 */
export function runGeminiVerified(prompt, { timeoutMs = 480000 } = {}) {
  const t0 = Date.now();
  const res = spawnSync(
    NODE22,
    [GEMINI_JS, '-m', MODEL, '--output-format', 'json', '--prompt', prompt],
    { encoding: 'utf8', timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024, cwd: process.cwd() },
  );
  if (res.error) throw new Error(`gemini CLI failed to start: ${res.error.message}`);
  const stdout = res.stdout ?? '';
  const jsonStart = stdout.indexOf('{');
  if (jsonStart < 0) {
    throw new Error(
      `gemini produced no JSON (exit ${res.status}).\nstderr: ${res.stderr?.slice(0, 2000)}`,
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(stdout.slice(jsonStart));
  } catch (e) {
    throw new Error(`gemini JSON parse failed: ${e.message}\nstdout head: ${stdout.slice(0, 500)}`);
  }
  const text = parsed.response;
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error(
      `gemini returned an empty .response (exit ${res.status}).\nstderr: ${res.stderr?.slice(0, 2000)}`,
    );
  }
  const seconds = (Date.now() - t0) / 1000;
  const models = parsed.stats?.models ?? {};
  const served = Object.keys(models);
  const model = served.length === 1 ? served[0] : served.join('+') || 'unknown';
  let promptTokens = 0;
  for (const m of Object.values(models)) {
    promptTokens += m?.tokens?.prompt ?? m?.tokens?.input ?? 0;
  }
  return { text: text.trim(), model, seconds, promptTokens };
}
