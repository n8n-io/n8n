#!/usr/bin/env node
/**
 * POST a JSON payload to the mutation-health writer webhook.
 *
 * Skips with a notice if the webhook env var is empty — that's the
 * dry-run mode the GHA falls back to when MUTATION_HEALTH_WEBHOOK
 * isn't configured yet.
 *
 * Usage:
 *   node scripts/mutation-health/post-payload.mjs <payload-file> [--env <var-name>]
 *
 * Exit codes:
 *   0 — POST succeeded, OR env var empty (dry-run skip)
 *   2 — usage error
 *   3 — POST failed (non-2xx)
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const args = process.argv.slice(2);
const payloadPath = args[0];
const envIdx = args.indexOf('--env');
const envName = envIdx >= 0 ? args[envIdx + 1] : 'MUTATION_HEALTH_WEBHOOK';

if (!payloadPath) {
	process.stderr.write('Usage: post-payload.mjs <payload-file> [--env <var-name>]\n');
	process.exit(2);
}
if (!existsSync(payloadPath)) {
	process.stderr.write(`Payload not found: ${payloadPath}\n`);
	process.exit(2);
}

const webhook = process.env[envName] ?? '';
if (!webhook) {
	process.stderr.write(`::notice::${envName} not set — dry-run, POST skipped (${payloadPath} uploaded as artefact).\n`);
	process.exit(0);
}

const body = await readFile(payloadPath, 'utf8');
const res = await fetch(webhook, {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body,
});

const text = await res.text();
if (!res.ok) {
	process.stderr.write(`POST failed: HTTP ${res.status}\n${text}\n`);
	process.exit(3);
}
process.stderr.write(`POST ok (HTTP ${res.status}): ${text.slice(0, 200)}\n`);
