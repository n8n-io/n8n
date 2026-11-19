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
	readRuntimeLockfileImpactDirs,
	selectLockfileImpactedDirs,
} from './read-lockfile-impact.js';

const lock = (zod: string, rootTurbo = '2.0.0', turboDep = '1.0.0') => `---
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
  turbo-dep@${turboDep}:
    resolution: {integrity: d${turboDep}}

snapshots:
  zod@${zod}: {}
  turbo@${rootTurbo}:
    dependencies:
      turbo-dep: ${turboDep}
  turbo-dep@${turboDep}: {}
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

	it('returns null when a direct dependency of the root package changed', () => {
		writeFileSync(join(dir, 'pnpm-lock.yaml'), lock('3.0.0', '2.1.0'));
		expect(readLockfileImpact('HEAD')).toBeNull();
	});

	it('ignores a transitive change below the root package dependencies', () => {
		writeFileSync(join(dir, 'pnpm-lock.yaml'), lock('3.0.0', '2.0.0', '1.0.1'));
		expect(readLockfileImpact('HEAD')).toEqual([]);
	});

	it('lists the dirs whose resolved runtime dependencies changed, not devDependencies', () => {
		writeFileSync(join(dir, 'pnpm-lock.yaml'), lock('3.1.0', '2.1.0'));
		expect(readRuntimeLockfileImpactDirs('HEAD')).toEqual(['packages/a']);
	});
});

describe('selectLockfileImpactedDirs', () => {
	const read = vi.fn<(base: string) => string[] | null>();
	beforeEach(() => read.mockReset());

	it('reads the impact against the lockfile base when the lockfile changed', () => {
		read.mockReturnValue(['packages/a']);
		expect(selectLockfileImpactedDirs(['pnpm-lock.yaml'], 'parent', read)).toEqual(['packages/a']);
		expect(read).toHaveBeenCalledWith('parent');
	});

	it('keeps a failed read unknown', () => {
		read.mockReturnValue(null);
		expect(selectLockfileImpactedDirs(['pnpm-lock.yaml'], 'parent', read)).toBeNull();
	});

	it('reports no impacted dirs when the lockfile did not change', () => {
		expect(selectLockfileImpactedDirs(['packages/a/package.json'], 'parent', read)).toEqual([]);
		expect(read).not.toHaveBeenCalled();
	});

	it('is unknown without a base commit', () => {
		expect(selectLockfileImpactedDirs(['pnpm-lock.yaml'], undefined, read)).toBeUndefined();
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
