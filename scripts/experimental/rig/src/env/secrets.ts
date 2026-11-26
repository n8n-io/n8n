import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

import { parseDotenv } from './dotenv';
import { setEnvValue } from './secret-store';

/** Secrets that `rig` generates once for each environment. */
const GENERATED_SECRETS: Record<string, () => string> = {
	N8N_ENCRYPTION_KEY: () => randomBytes(24).toString('hex'),
	N8N_RUNNERS_AUTH_TOKEN: () => randomBytes(16).toString('hex'),
	// The engine requires 32 characters or more.
	N8N_ENGINE_AUTH_SECRET: () => randomBytes(32).toString('hex'),
	N8N_ENGINE_RESUME_SECRET: () => randomBytes(32).toString('hex'),
};

export const GENERATED_SECRET_KEYS: readonly string[] = Object.keys(GENERATED_SECRETS);

const HEADER =
	'# Secrets of this rig environment. Only you can read this file (mode 0600).\n' +
	'# rig encrypts the values. Edit them with `rig env edit --on secrets`.\n' +
	'# rig generated the values below. You can add your own secrets, for example API keys.\n';

/** Adds missing generated secrets. Existing values stay. */
export function ensureSecrets(file: string): void {
	if (!existsSync(file)) writeFileSync(file, HEADER, { mode: 0o600 });
	chmodSync(file, 0o600);
	// Only the key names matter here, so there is nothing to decrypt.
	const present = new Set(parseDotenv(readFileSync(file, 'utf8')).map((entry) => entry.key));
	for (const [key, generate] of Object.entries(GENERATED_SECRETS)) {
		if (!present.has(key)) setEnvValue(file, key, generate());
	}
}
