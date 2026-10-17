// Extra environment for a preview instance, fetched from a webhook we control.
//
// It exists so preview configuration can change without a commit. The fetch runs
// inside the box, never on the runner: the credentials are Codespaces secrets,
// which Actions cannot read, and no value is logged or put on a command line.
//
// Whatever the webhook returns becomes environment. Anyone who can edit that
// workflow can therefore run code in a preview box.
import { setTimeout as sleep } from 'node:timers/promises';

const DEFAULT_USER = 'preview';
// A legal shell variable name. A key outside this cannot survive `tmux -e`.
const KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;
const REQUEST_TIMEOUT_MS = 10_000;

// The endpoint is reachable but not answering yet. Anything else is a config
// fault that will not fix itself.
const isRetryable = (status) => status === 429 || status >= 500;

/** `KEY=VALUE` pairs for a webhook body, appending to `warnings` for whatever it drops. */
function pairsFrom(body, warnings) {
	if (body === null || typeof body !== 'object' || Array.isArray(body)) {
		warnings.push('The preview env webhook did not return a JSON object. Serving without it.');
		return [];
	}

	const env = [];
	for (const [key, value] of Object.entries(body)) {
		if (!KEY.test(key)) {
			warnings.push(`Ignoring preview env key ${JSON.stringify(key)} — not a variable name.`);
			continue;
		}
		if (value === null || typeof value === 'object') {
			warnings.push(`Ignoring preview env ${key} — the value is not a string, number or boolean.`);
			continue;
		}
		env.push(`${key}=${String(value)}`);
	}
	return env;
}

/**
 * Environment from the preview env webhook, plus the warnings a caller should print.
 *
 * Missing configuration is not a failure and neither is an unreachable webhook: a
 * preview without the extra environment is still worth reviewing, so every path
 * here returns rather than throws.
 *
 * @returns {Promise<{ env: string[], warnings: string[] }>} env as `KEY=VALUE` pairs
 */
export async function fetchRemoteEnv({
	url,
	user,
	password,
	pr,
	fetchImpl = fetch,
	timeoutMs = 120_000,
	intervalMs = 3000,
} = {}) {
	const warnings = [];
	if (!url) {
		return { env: [], warnings };
	}
	if (!password) {
		warnings.push(
			'CODESPACE_ENV_URL is set but CODESPACE_ENV_PASSWORD is not. Serving without remote env.',
		);
		return { env: [], warnings };
	}

	let endpoint;
	try {
		// Never put the URL in a warning: it is a secret on this box.
		endpoint = new URL(url);
	} catch {
		warnings.push('CODESPACE_ENV_URL is not a valid URL. Serving without remote env.');
		return { env: [], warnings };
	}
	// Context for the webhook, so one endpoint can answer per PR.
	if (pr) {
		endpoint.searchParams.set('pr', pr);
	}

	const headers = {
		accept: 'application/json',
		authorization: `Basic ${Buffer.from(`${user || DEFAULT_USER}:${password}`).toString('base64')}`,
	};

	const deadline = Date.now() + timeoutMs;
	let attempt = 0;
	let lastError = 'no attempt completed';
	while (Date.now() < deadline) {
		attempt++;
		try {
			const res = await fetchImpl(endpoint, {
				headers,
				signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
			});
			if (res.ok) {
				try {
					return { env: pairsFrom(await res.json(), warnings), warnings };
				} catch {
					warnings.push('The preview env webhook did not return valid JSON. Serving without it.');
					return { env: [], warnings };
				}
			}
			if (!isRetryable(res.status)) {
				warnings.push(
					`The preview env webhook answered HTTP ${res.status}. Serving without remote env.`,
				);
				return { env: [], warnings };
			}
			lastError = `HTTP ${res.status}`;
		} catch (error) {
			lastError = error.message;
		}
		if (attempt === 1) console.log('Waiting for the preview env webhook…');
		await sleep(intervalMs);
	}

	warnings.push(
		`The preview env webhook did not answer within ${Math.round(timeoutMs / 1000)}s (last: ${lastError}). Serving without remote env.`,
	);
	return { env: [], warnings };
}
