/**
 * Configuration for `run-local-linked.mjs`: the two n8n instances, their
 * environment, and the Playwright command. Pure functions only, so that the
 * unit tests can check every value without a process.
 */

import path from 'path';
import { z } from 'zod';

export const MIN_NODE_MAJOR = 24;
export const DEFAULT_SCRIPTED_LLM_PORT = 5799;
export const DEFAULT_SANDBOX_SERVICE_PORT = 5798;
export const SPEC_DIR = 'tests/e2e/future-poc';

/** "This computer". The browser uses `localhost`, so its cookies do not mix with the cloud ones. */
export const LOCAL_INSTANCE = Object.freeze({
	name: 'local',
	host: 'localhost',
	port: 5678,
	brokerPort: 5690,
});

/** "Cloud". It uses `127.0.0.1`, a different cookie host from `localhost`. */
export const CLOUD_INSTANCE = Object.freeze({
	name: 'cloud',
	host: '127.0.0.1',
	port: 5680,
	brokerPort: 5691,
});

export function instanceUrl(instance) {
	return `http://${instance.host}:${instance.port}`;
}

// Digits only: `Number()` would also accept values such as `0x10` or `1e3`.
const portSchema = z
	.string()
	.regex(/^\d{1,5}$/)
	.transform(Number)
	.pipe(z.number().int().min(1).max(65535));
const extraEnvSchema = z.record(z.union([z.string(), z.number(), z.boolean()]));

/** Read a TCP port from an environment value. Use `fallback` when the value is empty. */
export function parsePort(raw, fallback, variableName) {
	if (raw === undefined || raw.trim() === '') return fallback;
	const result = portSchema.safeParse(raw.trim());
	if (!result.success) {
		throw new Error(`${variableName} must be a TCP port from 1 to 65535, got "${raw}"`);
	}
	return result.data;
}

/** Read extra n8n variables (N8N_TEST_ENV_LOCAL or N8N_TEST_ENV_CLOUD) from a JSON object. */
export function parseExtraEnv(raw, variableName) {
	if (raw === undefined || raw.trim() === '') return {};
	let json;
	try {
		json = JSON.parse(raw);
	} catch {
		throw new Error(`${variableName} is not valid JSON`);
	}
	const result = extraEnvSchema.safeParse(json);
	if (!result.success) {
		throw new Error(`${variableName} must be a JSON object of string, number or boolean values`);
	}
	return Object.fromEntries(
		Object.entries(result.data).map(([key, value]) => [key, String(value)]),
	);
}

/** The Node.js binary for n8n: N8N_NODE_BIN, else `node` on PATH. */
export function resolveNodeBin(env) {
	const configured = env.N8N_NODE_BIN?.trim();
	return configured ? configured : 'node';
}

/** Throw when `version` (for example `24.1.0`) is older than the version that n8n needs. */
export function assertNodeVersion(version, nodeBin) {
	// `parseInt` skips leading spaces and stops at the first dot.
	const major = Number.parseInt(String(version), 10);
	if (Number.isInteger(major) && major >= MIN_NODE_MAJOR) return;
	throw new Error(
		`n8n needs Node.js ${MIN_NODE_MAJOR} or later, but "${nodeBin}" is "${String(version).trim()}". ` +
			'Set N8N_NODE_BIN to the path of a Node.js 24 binary.',
	);
}

/**
 * Put the directory of `nodeBin` first on PATH. n8n starts its task runner
 * with `node` from PATH, so the runner must get the same Node.js version.
 */
export function pathWithNode(currentPath, nodeBin) {
	if (!nodeBin.includes(path.sep)) return currentPath;
	const nodeDir = path.dirname(path.resolve(nodeBin));
	return currentPath ? `${nodeDir}${path.delimiter}${currentPath}` : nodeDir;
}

/** Variables that both instances get. */
export function baseInstanceEnv(instance, userFolder) {
	return {
		E2E_TESTS: 'true',
		// Listen on the IPv4 loopback only. `localhost` also resolves to it.
		N8N_LISTEN_ADDRESS: '127.0.0.1',
		// Use the prebuilt native modules for Node.js 24 and do not compile them.
		PREBUILDS_ONLY: '1',
		N8N_PORT: String(instance.port),
		N8N_RUNNERS_BROKER_PORT: String(instance.brokerPort),
		N8N_USER_FOLDER: userFolder,
		N8N_LOG_LEVEL: 'warn',
		N8N_RESTRICT_FILE_ACCESS_TO: '',
	};
}

/** Assistant variables for "This computer". The model is the scripted LLM. */
export function localAssistantEnv({ llmPort, sandboxPort }) {
	return {
		N8N_ENABLED_MODULES: 'instance-ai',
		N8N_INSTANCE_AI_MODEL: 'anthropic/claude-scripted',
		// Keep `/v1`: the proxy code path does not add it.
		N8N_INSTANCE_AI_MODEL_URL: `http://127.0.0.1:${llmPort}/v1`,
		N8N_INSTANCE_AI_MODEL_API_KEY: 'scripted',
		N8N_INSTANCE_AI_LOCAL_GATEWAY_DISABLED: 'true',
		// A sandbox config skips the Assistant setup screen. Each agent turn writes
		// its skills to the sandbox, so the specs start a fake sandbox service here.
		N8N_INSTANCE_AI_SANDBOX_ENABLED: 'true',
		N8N_INSTANCE_AI_SANDBOX_PROVIDER: 'n8n-sandbox',
		N8N_SANDBOX_SERVICE_URL: `http://127.0.0.1:${sandboxPort}`,
		N8N_EXPERIENCE_MODES_ENABLED: 'true',
		// Let "This computer" call the cloud instance on 127.0.0.1.
		N8N_SSRF_ALLOWED_IP_RANGES: '127.0.0.1/32',
	};
}

/** Variables for "Cloud". */
export function cloudEnv() {
	return {
		// Many MCP calls in one test must not hit the rate limit.
		N8N_MCP_SERVER_RATE_LIMIT: '0',
		// Playwright sends a `Secure` cookie over plain HTTP only to `localhost`.
		// The cloud origin is 127.0.0.1, so its auth cookie must not be `Secure`.
		N8N_SECURE_COOKIE: 'false',
	};
}

/**
 * The full environment of one n8n process. Caller variables come last, so
 * N8N_TEST_ENV_LOCAL and N8N_TEST_ENV_CLOUD can override all other values.
 */
export function buildInstanceEnv({ parentEnv, nodeBin, instanceEnv, extraEnv }) {
	const pathValue = pathWithNode(parentEnv.PATH, nodeBin);
	return {
		...parentEnv,
		...(pathValue === undefined ? {} : { PATH: pathValue }),
		...instanceEnv,
		...extraEnv,
	};
}

/** Arguments for `pnpm`. Caller paths replace the default spec folder. */
export function buildPlaywrightArgs(userArgs) {
	const hasExplicitPath = userArgs.some(
		(arg) => arg.startsWith('tests/') || arg.endsWith('.spec.ts'),
	);
	return [
		'exec',
		'playwright',
		'test',
		'--project=e2e',
		...(hasExplicitPath ? [] : [SPEC_DIR]),
		'--workers=1',
		...userArgs,
	];
}

/** Environment for Playwright. The runner starts both instances, so Playwright must not. */
export function buildPlaywrightEnv(parentEnv, { llmPort, sandboxPort }) {
	return {
		...parentEnv,
		N8N_BASE_URL: instanceUrl(LOCAL_INSTANCE),
		CLOUD_BASE_URL: instanceUrl(CLOUD_INSTANCE),
		SCRIPTED_LLM_PORT: String(llmPort),
		SANDBOX_SERVICE_PORT: String(sandboxPort),
		PLAYWRIGHT_SKIP_WEBSERVER: 'true',
		PLAYWRIGHT_ALLOW_CONTAINER_ONLY: 'true',
	};
}

/** Return the last `maxLines` lines of a log, for the failure report. */
export function tailLines(text, maxLines) {
	const lines = text.replace(/\n+$/, '').split('\n');
	return lines.slice(-maxLines).join('\n');
}
