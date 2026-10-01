#!/usr/bin/env node
/**
 * Thin wrapper around `run-local-isolated.mjs` that pre-fills the env vars
 * the instance-ai module needs at boot. Behaves exactly like
 * `pnpm test:local:isolated tests/e2e/instance-ai [args]`, but you don't have
 * to remember (or re-type) the JSON.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... pnpm test:local:instance-ai
 *   ANTHROPIC_API_KEY=sk-ant-... pnpm test:local:instance-ai --grep "preview"
 *   ANTHROPIC_API_KEY=sk-ant-... pnpm test:local:instance-ai instance-ai-workflow-preview.spec.ts
 *
 * All extra args flow through to `playwright test`. If you don't pass an
 * explicit path, the runner defaults to the whole `tests/e2e/instance-ai`
 * directory.
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
	console.error(
		'Error: ANTHROPIC_API_KEY is not set.\n' +
			'Export a real key before running, e.g.:\n' +
			'  export ANTHROPIC_API_KEY=sk-ant-...\n' +
			'  pnpm test:local:instance-ai',
	);
	process.exit(1);
}

// Layer instance-ai env on top of any caller-supplied N8N_TEST_ENV so power
// users can still pin a different model or override flags.
const callerTestEnv = (() => {
	try {
		return process.env.N8N_TEST_ENV ? JSON.parse(process.env.N8N_TEST_ENV) : {};
	} catch {
		console.warn('[run-local-instance-ai] Ignoring malformed N8N_TEST_ENV.');
		return {};
	}
})();

const testEnv = {
	N8N_ENABLED_MODULES: 'instance-ai',
	N8N_INSTANCE_AI_MODEL: 'anthropic/claude-sonnet-4-6',
	N8N_INSTANCE_AI_MODEL_API_KEY: apiKey,
	N8N_INSTANCE_AI_LOCAL_GATEWAY_DISABLED: 'true',
	...callerTestEnv,
};

const userArgs = process.argv.slice(2);
const hasExplicitPath = userArgs.some((a) => a.startsWith('tests/') || a.endsWith('.spec.ts'));

const isolatedScript = path.join(__dirname, 'run-local-isolated.mjs');
const args = [isolatedScript];
if (!hasExplicitPath) args.push('tests/e2e/instance-ai');
args.push(...userArgs);

const result = spawnSync('node', args, {
	stdio: 'inherit',
	env: { ...process.env, N8N_TEST_ENV: JSON.stringify(testEnv) },
});

process.exit(result.status ?? 1);
