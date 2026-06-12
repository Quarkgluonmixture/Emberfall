/*
 * Gemini quota check (`node scripts/gemini-quota.mjs`): asks the same Code
 * Assist endpoint the CLI uses internally (retrieveUserQuota) and prints the
 * per-model buckets — remaining requests, limit and reset time. Run BEFORE
 * long Gemini batteries: near-exhaustion the CLI degrades SILENTLY (drops
 * attachments) long before it throws TerminalQuotaError.
 *
 * Auth: the gemini CLI's cached OAuth refresh token (~/.gemini/
 * oauth_creds.json) + its embedded public OAuth client (open-source
 * constants from @google/gemini-cli).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { cliOAuthClient } from './gemini-cli.mjs';

const { id: CLIENT_ID, secret: CLIENT_SECRET } = cliOAuthClient();
const ENDPOINT = 'https://cloudcode-pa.googleapis.com/v1internal';

const creds = JSON.parse(
  fs.readFileSync(path.join(os.homedir(), '.gemini', 'oauth_creds.json'), 'utf8'),
);

// Refresh the access token (the cached one is usually expired).
const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: creds.refresh_token,
    grant_type: 'refresh_token',
  }),
});
if (!tokenRes.ok)
  throw new Error(`token refresh failed: ${tokenRes.status} ${await tokenRes.text()}`);
const { access_token } = await tokenRes.json();

const post = async (method, body) => {
  const r = await fetch(`${ENDPOINT}:${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access_token}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${method} failed: ${r.status} ${await r.text()}`);
  return r.json();
};

// The managed project id comes from loadCodeAssist (free-tier accounts).
const load = await post('loadCodeAssist', {
  metadata: { ideType: 'IDE_UNSPECIFIED', platform: 'PLATFORM_UNSPECIFIED', pluginType: 'GEMINI' },
});
const project = load.cloudaicompanionProject;
console.log(
  `tier: ${load.currentTier?.id ?? load.currentTier?.name ?? 'unknown'} · project: ${project}`,
);

const quota = await post('retrieveUserQuota', { project });
if (!quota.buckets?.length) {
  console.log('no quota buckets returned:', JSON.stringify(quota));
  process.exit(0);
}
for (const b of quota.buckets) {
  const pct = b.remainingFraction != null ? `${Math.round(b.remainingFraction * 100)}%` : '?';
  const amount = b.remainingAmount != null ? ` (${b.remainingAmount} left)` : '';
  const reset = b.resetTime ? ` · resets ${b.resetTime}` : '';
  console.log(`${(b.modelId ?? 'unknown').padEnd(28)} ${pct.padStart(4)}${amount}${reset}`);
}
