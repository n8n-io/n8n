import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

import { readDotenv, setInDotenv } from './dotenv';

/** Secrets that `rig` generates once for each environment. */
const GENERATED_SECRETS: Record<string, () => string> = {
	N8N_ENCRYPTION_KEY: () => randomBytes(24).toString('hex'),
	N8N_RUNNERS_AUTH_TOKEN: () => randomBytes(16).toString('hex'),
	// The engine requires 32 characters or more.
	N8N_ENGINE_AUTH_SECRET: () => randomBytes(32).toString('hex'),
	N8N_ENGINE_RESUME_SECRET: () => randomBytes(32).toString('hex'),
};

const HEADER =
	'# Secrets of this rig environment. Only you can read this file (mode 0600).\n' +
	'# rig generated the values below. You can add your own secrets, for example API keys.\n';

/** Adds missing generated secrets. Existing values stay. */
export function ensureSecrets(file: string): void {
	let text = existsSync(file) ? readFileSync(file, 'utf8') : HEADER;
	const present = new Set(readDotenv(file).map((entry) => entry.key));
	let changed = !existsSync(file);
	for (const [key, generate] of Object.entries(GENERATED_SECRETS)) {
		if (present.has(key)) continue;
		text = setInDotenv(text, key, generate());
		changed = true;
	}
	if (changed) writeFileSync(file, text, { mode: 0o600 });
	chmodSync(file, 0o600);
}
