import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { StartedTestContainer } from 'testcontainers';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('node:child_process', () => ({ execFile: vi.fn() }));

import { execFile } from 'node:child_process';

import { NpmRegistryHelper, npmRegistry, type NpmRegistryResult } from '../services/npm-registry';

const execFileMock = vi.mocked(execFile);
const META = { internalUrl: 'http://npm-registry:4873', externalUrl: 'http://localhost:32771' };

type ExecCallback = (error: Error | null, result?: { stdout: string; stderr: string }) => void;

function execFileSucceeds() {
	execFileMock.mockImplementation(((...args: unknown[]) => {
		(args.at(-1) as ExecCallback)(null, { stdout: '', stderr: '' });
	}) as typeof execFile);
}

function execFileFails(message: string) {
	execFileMock.mockImplementation(((...args: unknown[]) => {
		(args.at(-1) as ExecCallback)(new Error(message));
	}) as typeof execFile);
}

function fetchReturns(status: number, body: unknown) {
	return vi.fn().mockResolvedValue({
		ok: status >= 200 && status < 300,
		status,
		json: async () => body,
		text: async () => JSON.stringify(body),
	});
}

async function packageDirectory(name: string, version: string): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), 'npm-registry-test-'));
	await writeFile(join(dir, 'package.json'), JSON.stringify({ name, version }));
	return dir;
}

function publishArgs(call: number): string[] {
	return execFileMock.mock.calls[call][1] as string[];
}

describe('npmRegistry.env', () => {
	const result = { container: {} as StartedTestContainer, meta: META } as NpmRegistryResult;

	test('points n8n and npm itself at the registry over the Docker network', () => {
		expect(npmRegistry.env!(result)).toEqual({
			N8N_COMMUNITY_PACKAGES_REGISTRY: META.internalUrl,
			NPM_CONFIG_REGISTRY: META.internalUrl,
		});
	});

	test('uses the host-mapped URL when n8n runs outside the Docker network', () => {
		expect(npmRegistry.env!(result, true)).toEqual({
			N8N_COMMUNITY_PACKAGES_REGISTRY: META.externalUrl,
			NPM_CONFIG_REGISTRY: META.externalUrl,
		});
	});
});

describe('NpmRegistryHelper.publishDirectory', () => {
	const dirs: string[] = [];

	beforeEach(() => {
		execFileMock.mockReset();
		vi.stubGlobal('fetch', fetchReturns(201, { ok: 'user created', token: 'secret-token' }));
	});

	afterEach(async () => {
		vi.unstubAllGlobals();
		await Promise.all(
			dirs.splice(0).map(async (dir) => await rm(dir, { recursive: true, force: true })),
		);
	});

	test('publishes to the host-mapped registry with the token in an npmrc, not in argv', async () => {
		execFileSucceeds();
		const dir = await packageDirectory('n8n-nodes-example', '1.2.3');
		dirs.push(dir);
		let npmrc = '';
		execFileMock.mockImplementation(((...args: unknown[]) => {
			const userconfig = (args[1] as string[])
				.find((arg) => arg.startsWith('--userconfig='))!
				.slice('--userconfig='.length);
			void readFile(userconfig, 'utf8').then((content) => {
				npmrc = content;
				(args.at(-1) as ExecCallback)(null, { stdout: '', stderr: '' });
			});
		}) as typeof execFile);

		const published = await new NpmRegistryHelper(META).publishDirectory(dir);

		expect(published).toEqual({ name: 'n8n-nodes-example', version: '1.2.3' });
		const args = publishArgs(0);
		expect(args.slice(0, 2)).toEqual(['publish', dir]);
		expect(args).toContain(`--registry=${META.externalUrl}`);
		expect(args.join(' ')).not.toContain('secret-token');
		expect(npmrc).toBe('//localhost:32771/:_authToken=secret-token\n');
	});

	test('creates the publish user once and reuses its token', async () => {
		execFileSucceeds();
		const helper = new NpmRegistryHelper(META);
		const first = await packageDirectory('n8n-nodes-a', '1.0.0');
		const second = await packageDirectory('n8n-nodes-b', '1.0.0');
		dirs.push(first, second);

		await helper.publishDirectory(first);
		await helper.publishDirectory(second);

		expect(fetch).toHaveBeenCalledTimes(1);
		const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
		expect(url).toMatch(/^http:\/\/localhost:32771\/-\/user\/org\.couchdb\.user:e2e-/);
		expect(init.method).toBe('PUT');
		expect(execFileMock).toHaveBeenCalledTimes(2);
	});

	test('reports a refused user creation', async () => {
		vi.stubGlobal('fetch', fetchReturns(409, { error: 'user already exists' }));
		const dir = await packageDirectory('n8n-nodes-example', '1.0.0');
		dirs.push(dir);

		await expect(new NpmRegistryHelper(META).publishDirectory(dir)).rejects.toThrow(
			/creating a publish user failed: 409/,
		);
		expect(execFileMock).not.toHaveBeenCalled();
	});

	test('names the package in a publish failure and redacts any token npm echoes back', async () => {
		execFileFails('npm ERR! 403 Forbidden --//localhost:32771/:_authToken=secret-token');
		const dir = await packageDirectory('n8n-nodes-example', '2.0.0');
		dirs.push(dir);

		const failure = new NpmRegistryHelper(META).publishDirectory(dir);

		await expect(failure).rejects.toThrow(/publishing n8n-nodes-example@2\.0\.0 failed/);
		await expect(failure).rejects.not.toThrow(/secret-token/);
	});
});
