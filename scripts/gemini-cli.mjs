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
import fs from 'node:fs';
import os from 'node:os';
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

/**
 * Remaining-quota fraction (0..1) for MODEL via the same Code Assist
 * endpoint the CLI uses (see scripts/gemini-quota.mjs for the full table).
 * Returns null when the check itself fails — callers should proceed, the
 * per-call token gate still protects them. Call this BEFORE batteries:
 * near zero the CLI degrades SILENTLY (drops attachments) before erroring.
 */
/** The CLI's public OAuth client, read from its installed bundle at runtime
    (installed-app constants, not user secrets — but keeping the literal out
    of the repo appeases GitHub push protection and survives rotation). */
export function cliOAuthClient() {
  const bundleDir = path.dirname(GEMINI_JS);
  for (const f of fs.readdirSync(bundleDir).filter((n) => n.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(bundleDir, f), 'utf8');
    const id = src.match(/OAUTH_CLIENT_ID = "([^"]+)"/)?.[1];
    const secret = src.match(/OAUTH_CLIENT_SECRET = "([^"]+)"/)?.[1];
    if (id && secret) return { id, secret };
  }
  throw new Error('OAuth constants not found in the gemini-cli bundle.');
}

export async function quotaFraction(model = MODEL) {
  try {
    const client = cliOAuthClient();
    const creds = JSON.parse(
      fs.readFileSync(path.join(os.homedir(), '.gemini', 'oauth_creds.json'), 'utf8'),
    );
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: client.id,
        client_secret: client.secret,
        refresh_token: creds.refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    const { access_token } = await tokenRes.json();
    const post = async (method, body) => {
      const r = await fetch(`https://cloudcode-pa.googleapis.com/v1internal:${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access_token}` },
        body: JSON.stringify(body),
      });
      return r.json();
    };
    const load = await post('loadCodeAssist', {
      metadata: {
        ideType: 'IDE_UNSPECIFIED',
        platform: 'PLATFORM_UNSPECIFIED',
        pluginType: 'GEMINI',
      },
    });
    const quota = await post('retrieveUserQuota', { project: load.cloudaicompanionProject });
    const bucket = quota.buckets?.find((b) => b.modelId === model);
    return bucket
      ? { fraction: bucket.remainingFraction ?? null, resetTime: bucket.resetTime }
      : null;
  } catch {
    return null;
  }
}

/** Abort loudly when MODEL's quota is empty; warn when it's running low. */
export async function ensureQuota(minFraction = 0.1) {
  const q = await quotaFraction();
  if (!q || q.fraction == null) return;
  if (q.fraction === 0) {
    throw new Error(
      `${MODEL} quota is EXHAUSTED (resets ${q.resetTime}). Near-zero quota also degrades silently — do not burn retries; rerun after the reset.`,
    );
  }
  if (q.fraction < minFraction) {
    console.warn(
      `⚠ ${MODEL} quota at ${Math.round(q.fraction * 100)}% (resets ${q.resetTime}) — calls may degrade silently; the token gate will flag blind calls.`,
    );
  } else {
    console.log(`${MODEL} quota: ${Math.round(q.fraction * 100)}% remaining`);
  }
}

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
