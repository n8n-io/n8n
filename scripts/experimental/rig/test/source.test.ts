import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { parseTopology } from '../src/config/env-yaml';
import { RigError } from '../src/errors';
import {
	DEFAULT_LAUNCHER_VERSION,
	ensureLauncherBinary,
	launcherSource,
	releaseBinaryPath,
	versionFromCheckout,
} from '../src/launcher/binary';
import { resolveSource } from '../src/source';

let root: string;
let checkout: string;
let outside: string;

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'rig-source-'));
	checkout = join(root, 'n8n');
	outside = join(root, 'elsewhere');
	mkdirSync(join(checkout, 'packages/cli'), { recursive: true });
	mkdirSync(outside);
	writeFileSync(join(checkout, 'package.json'), JSON.stringify({ name: 'n8n-monorepo' }));
	vi.stubEnv('INIT_CWD', outside);
	vi.stubEnv('RIG_CACHE_DIR', join(root, 'cache'));
	vi.stubEnv('RIG_LAUNCHER_PATH', '');
});

afterEach(() => {
	vi.unstubAllEnvs();
	rmSync(root, { recursive: true, force: true });
});

describe('source resolution', () => {
	it('should accept auto and repo:<path> in env.yaml', () => {
		expect(parseTopology({ name: 't' }).source).toBe('auto');
		expect(parseTopology({ name: 't', source: 'repo:~/n8n' }).source).toBe('repo:~/n8n');
		expect(() => parseTopology({ name: 't', source: 'npm:1.0.0' })).toThrow(RigError);
	});

	it('should use the checkout of the current directory first', () => {
		vi.stubEnv('INIT_CWD', join(checkout, 'packages/cli'));
		expect(resolveSource('auto')).toEqual({ root: checkout, origin: 'current directory' });
	});

	it('should fall back to the checkout of rig outside a checkout', () => {
		expect(resolveSource('auto')).toMatchObject({ origin: 'rig checkout' });
	});

	it('should pin repo:<path> even inside another checkout', () => {
		const other = join(root, 'other');
		mkdirSync(other);
		writeFileSync(join(other, 'package.json'), JSON.stringify({ name: 'n8n-monorepo' }));
		vi.stubEnv('INIT_CWD', other);
		expect(resolveSource(`repo:${checkout}`)).toEqual({
			root: checkout,
			origin: 'env.yaml',
		});
		expect(resolveSource(`repo:${outside}`).problem?.message).toContain('is not an n8n checkout');
	});
});

describe('launcher source', () => {
	const dockerfile = 'docker/images/runners/Dockerfile.debian';

	it('should prefer a launcher checkout', () => {
		const config = {
			launcher: { path: '/launcher', version: '1.2.3' },
			container: {},
			secrets: {},
			license: {},
		};
		expect(launcherSource(config, checkout)).toEqual({ kind: 'checkout', path: '/launcher' });
	});

	it('should take the version from the global config, then the runners image, then the default', () => {
		mkdirSync(join(checkout, 'docker/images/runners'), { recursive: true });
		writeFileSync(join(checkout, dockerfile), 'FROM x\nARG LAUNCHER_VERSION=1.5.1\nRUN true\n');
		expect(versionFromCheckout(checkout)).toBe('1.5.1');

		expect(
			launcherSource(
				{ launcher: { version: '1.4.0' }, container: {}, secrets: {}, license: {} },
				checkout,
			),
		).toMatchObject({
			version: '1.4.0',
			versionFrom: 'global config',
		});
		expect(
			launcherSource({ launcher: {}, container: {}, secrets: {}, license: {} }, checkout),
		).toMatchObject({
			version: '1.5.1',
			versionFrom: 'runners image',
		});
		expect(
			launcherSource({ launcher: {}, container: {}, secrets: {}, license: {} }, undefined),
		).toMatchObject({
			version: DEFAULT_LAUNCHER_VERSION,
			versionFrom: 'default',
		});
	});

	it('should cache releases per version', () => {
		expect(releaseBinaryPath('1.6.0')).toBe(
			join(root, 'cache/launcher/1.6.0/task-runner-launcher'),
		);
	});
});

describe('launcher release download', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('should reject an archive whose SHA-256 sum does not match', async () => {
		vi.spyOn(process, 'platform', 'get').mockReturnValue('linux');
		vi.spyOn(process, 'arch', 'get').mockReturnValue('x64');
		const urls: string[] = [];
		vi.stubGlobal('fetch', async (url: string) => {
			urls.push(url);
			return new Response(url.endsWith('.sha256') ? `${'0'.repeat(64)}\n` : 'archive');
		});

		await expect(
			ensureLauncherBinary({ kind: 'release', version: '1.6.0', versionFrom: 'default' }, () => {}),
		).rejects.toThrow(
			'The checksum of task-runner-launcher-1.6.0-linux-amd64.tar.gz does not match',
		);
		expect(urls).toContain(
			'https://github.com/n8n-io/task-runner-launcher/releases/download/1.6.0/task-runner-launcher-1.6.0-linux-amd64.tar.gz.sha256',
		);
		expect(existsSync(releaseBinaryPath('1.6.0'))).toBe(false);
	});
});
