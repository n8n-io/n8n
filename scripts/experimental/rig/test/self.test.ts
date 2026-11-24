import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RigError } from '../src/errors';
import { type BuildInfo, versionId } from '../src/self/build-info';
import {
	handOffTarget,
	isTrustedCheckout,
	trustCheckout,
	trustedCheckouts,
} from '../src/self/delegate';
import {
	currentInstall,
	installBundle,
	installedIds,
	rollback,
	shimPath,
	versionsDir,
} from '../src/self/install';

let root: string;
let bundle: string;

function info(commit: string, overrides: Partial<BuildInfo> = {}): BuildInfo {
	return {
		version: '0.1.0',
		commit,
		dirty: false,
		builtAt: '2026-11-13T10:20:30.000Z',
		...overrides,
	};
}

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'rig-self-'));
	vi.stubEnv('RIG_DATA_DIR', join(root, 'data'));
	vi.stubEnv('RIG_BIN_DIR', join(root, 'bin'));
	bundle = join(root, 'rig.mjs');
	writeFileSync(bundle, 'console.log("rig");\n');
});

afterEach(() => {
	vi.unstubAllEnvs();
	rmSync(root, { recursive: true, force: true });
});

describe('versionId', () => {
	it('should use the version and the commit', () => {
		expect(versionId(info('abc1234567'))).toBe('0.1.0+abc1234567');
	});

	it('should make each dirty build unique', () => {
		expect(versionId(info('abc1234567', { dirty: true }))).toBe(
			'0.1.0+abc1234567.dirty.20261113102030',
		);
	});
});

describe('global install', () => {
	it('should copy the bundle, record the checkout, and write a shim to it', () => {
		const { id, previous } = installBundle({ file: bundle, info: info('aaa') }, '/repo');
		expect(id).toBe('0.1.0+aaa');
		expect(previous).toBeUndefined();
		expect(readFileSync(join(versionsDir(), id, 'rig.mjs'), 'utf8')).toContain('rig');
		expect(currentInstall()).toMatchObject({ id, info: { commit: 'aaa', checkout: '/repo' } });

		const shim = readFileSync(shimPath(), 'utf8');
		expect(shim).toMatch(/^#!\/bin\/sh\n/);
		expect(shim).toContain(`exec node '${join(versionsDir(), id, 'rig.mjs')}' "$@"`);
	});

	it('should roll back to the previous version, and stop at the oldest', () => {
		installBundle({ file: bundle, info: info('aaa') }, '/repo');
		const second = installBundle({ file: bundle, info: info('bbb') }, '/repo');
		expect(second.previous).toBe('0.1.0+aaa');

		expect(rollback()).toEqual({ from: '0.1.0+bbb', to: '0.1.0+aaa' });
		expect(currentInstall()?.id).toBe('0.1.0+aaa');
		expect(readFileSync(shimPath(), 'utf8')).toContain('0.1.0+aaa/rig.mjs');
		expect(() => rollback()).toThrow('There is no earlier version');
	});

	it('should keep the last five versions', () => {
		for (const commit of ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7']) {
			installBundle({ file: bundle, info: info(commit) }, '/repo');
		}
		expect(installedIds()).toEqual(['a3', 'a4', 'a5', 'a6', 'a7'].map((c) => `0.1.0+${c}`));
		expect(existsSync(join(versionsDir(), '0.1.0+a1'))).toBe(false);
		expect(existsSync(join(versionsDir(), '0.1.0+a7', 'rig.mjs'))).toBe(true);
	});

	it('should not replace a rig file that it did not write, unless forced', () => {
		mkdirSync(join(root, 'bin'));
		writeFileSync(shimPath(), '#!/bin/sh\necho other rig\n');
		expect(() => installBundle({ file: bundle, info: info('aaa') }, '/repo')).toThrow(RigError);
		installBundle({ file: bundle, info: info('aaa') }, '/repo', { force: true });
		expect(readFileSync(shimPath(), 'utf8')).toContain('rig-shim');
	});
});

describe('hand-off', () => {
	it('should not hand off when rig runs from source', () => {
		expect(handOffTarget()).toEqual({ kind: 'none' });
	});
});

describe('checkout trust', () => {
	it('should trust a checkout once and keep the trust', () => {
		expect(isTrustedCheckout('/repo')).toBe(false);
		trustCheckout('/repo');
		trustCheckout('/repo');
		trustCheckout('/other');
		expect(trustedCheckouts()).toEqual(['/repo', '/other']);
		expect(isTrustedCheckout('/repo')).toBe(true);
	});

	it('should ignore a broken trust file', () => {
		mkdirSync(join(root, 'data'), { recursive: true });
		writeFileSync(join(root, 'data', 'trusted-checkouts.json'), 'not json');
		expect(trustedCheckouts()).toEqual([]);
		expect(isTrustedCheckout('/repo')).toBe(false);
	});
});

describe('bundle', () => {
	it('should build one file without typescript, and write the build info', () => {
		const packageDir = join(import.meta.dirname, '..');
		const outDir = join(root, 'dist');
		const result = spawnSync(
			join(packageDir, 'node_modules/.bin/tsdown'),
			['--config-loader', 'unrun', '--logLevel', 'warn', '--out-dir', outDir],
			{ cwd: packageDir, encoding: 'utf8' },
		);
		expect(result.status, result.stderr).toBe(0);

		const code = readFileSync(join(outDir, 'rig.mjs'), 'utf8');
		expect(code.startsWith('#!/usr/bin/env node')).toBe(true);
		expect(code).not.toMatch(/from ["']typescript["']/);
		expect(code).not.toMatch(/from ["']testcontainers["']/);
		expect(JSON.parse(readFileSync(join(outDir, 'build.json'), 'utf8'))).toMatchObject({
			version: '0.1.0',
		});
	}, 60_000);
});
