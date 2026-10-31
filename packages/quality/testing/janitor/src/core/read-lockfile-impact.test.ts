import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getGitRoot: vi.fn<() => string>() }));

vi.mock('../utils/git-operations.js', () => ({ getGitRoot: mocks.getGitRoot }));

import {
	formatLockfileImpact,
	parseLockfileImpact,
	readLockfileImpact,
} from './read-lockfile-impact.js';

const lock = (zod: string, rootTurbo = '2.0.0') => `---
lockfileVersion: '9.0'

importers:
  .:
    devDependencies:
      turbo:
        specifier: ^2
        version: ${rootTurbo}
  packages/a:
    dependencies:
      zod:
        specifier: ^3
        version: ${zod}
  packages/b:
    dependencies: {}

packages:
  zod@${zod}:
    resolution: {integrity: z${zod}}
  turbo@${rootTurbo}:
    resolution: {integrity: t${rootTurbo}}

snapshots:
  zod@${zod}: {}
  turbo@${rootTurbo}: {}
`;

describe('readLockfileImpact', () => {
	let dir: string;
	const git = (...args: string[]) =>
		execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], {
			cwd: dir,
			encoding: 'utf-8',
		}).trim();

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'janitor-lockfile-impact-'));
		for (const pkg of ['a', 'b']) {
			mkdirSync(join(dir, 'packages', pkg), { recursive: true });
			writeFileSync(join(dir, 'packages', pkg, 'package.json'), JSON.stringify({ name: pkg }));
		}
		writeFileSync(join(dir, 'pnpm-lock.yaml'), lock('3.0.0'));
		git('init', '-q');
		git('add', '.');
		git('commit', '-qm', 'base');
		mocks.getGitRoot.mockReturnValue(dir);
	});

	afterEach(() => rmSync(dir, { recursive: true, force: true }));

	it('names the packages whose resolved dependencies changed', () => {
		writeFileSync(join(dir, 'pnpm-lock.yaml'), lock('3.1.0'));
		expect(readLockfileImpact('HEAD')).toEqual(['a']);
	});

	it('returns null when the root package dependencies changed', () => {
		writeFileSync(join(dir, 'pnpm-lock.yaml'), lock('3.0.0', '2.1.0'));
		expect(readLockfileImpact('HEAD')).toBeNull();
	});
});

describe('LOCKFILE_IMPACTED_PACKAGES', () => {
	it('round-trips names, NONE, and ALL', () => {
		for (const value of [['a', 'b'], [], null]) {
			expect(parseLockfileImpact(formatLockfileImpact(value))).toEqual(value);
		}
		expect(parseLockfileImpact(undefined)).toBeNull();
	});
});
