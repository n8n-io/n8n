import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { createEnvironment } from '../src/commands/lifecycle';
import { parseTopology } from '../src/config/env-yaml';
import { configDir, envsDir } from '../src/config/paths';
import { clearKeyCache, readEnvFile } from '../src/env/secret-store';
import { envPaths } from '../src/environment';

const BIN = join(__dirname, '..', 'bin', 'rig.mjs');

function rig(args: string[], input: string) {
	// The child gets the RIG_* dirs and RIG_SECRETS_BACKEND of test/setup.ts.
	return spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8', input });
}

beforeAll(() => {
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
	createEnvironment(parseTopology({ name: 't' }));
});

afterEach(() => {
	clearKeyCache();
});

describe('rig env set with a bare key', () => {
	it('should read the value from stdin and encrypt it', () => {
		const result = rig(
			['env', 'set', 'OPENAI_API_KEY', '--on', 'shared', '--env', 't', '--no-restart'],
			'sk-piped\n',
		);
		expect(result.stderr).not.toMatch(/✖/);
		expect(result.status).toBe(0);

		const file = envPaths('t').layerFile('shared');
		expect(readFileSync(file, 'utf8')).not.toContain('sk-piped');
		expect(readEnvFile(file).find((e) => e.key === 'OPENAI_API_KEY')?.value).toBe('sk-piped');
	}, 30_000);

	it('should take one bare key from stdin only', () => {
		const result = rig(['env', 'set', 'A_KEY', 'B_KEY', '--env', 't', '--no-restart'], 'x\n');
		expect(result.status).toBe(1);
		expect(result.stderr).toContain('stdin can give the value of one key only');
	}, 30_000);

	it('should refuse a secret value on the command line', () => {
		const sensitive = rig(
			[
				'env',
				'set',
				'OPENAI_API_KEY=sk-inline',
				'N8N_LOG_LEVEL=debug',
				'--env',
				't',
				'--no-restart',
			],
			'',
		);
		expect(sensitive.status).toBe(1);
		expect(sensitive.stderr).toContain('OPENAI_API_KEY is a secret');
		expect(sensitive.stderr).toContain('rig env set OPENAI_API_KEY');

		const secretLayer = rig(['env', 'set', 'MY_SETTING=x', '--secret', '--env', 't'], '');
		expect(secretLayer.status).toBe(1);
		expect(secretLayer.stderr).toContain('MY_SETTING is a secret');
		expect(secretLayer.stderr).toContain('rig env set MY_SETTING --secret');

		// Nothing changed, also not the value that is not secret.
		const shared = readFileSync(envPaths('t').layerFile('shared'), 'utf8');
		expect(shared).not.toContain('sk-inline');
		expect(shared).not.toContain('N8N_LOG_LEVEL=debug');
	}, 30_000);

	it('should still take values that are not secret on the command line', () => {
		const result = rig(['env', 'set', 'N8N_LOG_LEVEL=warn', '--env', 't', '--no-restart'], '');
		expect(result.status).toBe(0);
		expect(readFileSync(envPaths('t').layerFile('shared'), 'utf8')).toContain('N8N_LOG_LEVEL=warn');
	}, 30_000);

	it('should refuse empty stdin', () => {
		const result = rig(['env', 'set', 'A_KEY', '--env', 't', '--no-restart'], '');
		expect(result.status).toBe(1);
		expect(result.stderr).toContain('stdin has no value for A_KEY');
	}, 30_000);
});

// The environment lives for the whole file. Delete it at the end.
afterAll(() => {
	vi.restoreAllMocks();
	rmSync(envsDir(), { recursive: true, force: true });
	rmSync(configDir(), { recursive: true, force: true });
});
