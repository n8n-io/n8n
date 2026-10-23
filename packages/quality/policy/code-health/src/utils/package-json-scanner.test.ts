import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { parsePackageJson, relativeDir } from './package-json-scanner.js';

describe('parsePackageJson', () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'pkg-scanner-'));
	});
	afterEach(() => rmSync(dir, { recursive: true, force: true }));

	function write(pkg: Record<string, unknown>): string {
		const file = join(dir, 'package.json');
		writeFileSync(file, JSON.stringify(pkg, null, 2));
		return file;
	}

	it('marks a package with "private": true as private', () => {
		expect(parsePackageJson(write({ name: 'p', private: true })).private).toBe(true);
	});

	it('treats an omitted or false private field as not private', () => {
		expect(parsePackageJson(write({ name: 'p' })).private).toBe(false);
		expect(parsePackageJson(write({ name: 'p', private: false })).private).toBe(false);
	});

	it('does not treat a non-boolean private value as private', () => {
		// only a strict `true` counts — a stray "false"/0 must not silently exclude a real package
		expect(parsePackageJson(write({ name: 'p', private: 'false' })).private).toBe(false);
	});
});

describe('relativeDir', () => {
	it('returns the package dir relative to root with forward slashes', () => {
		const root = join('/repo');
		expect(relativeDir(root, join(root, 'packages', '@n8n', 'core', 'package.json'))).toBe(
			'packages/@n8n/core',
		);
	});
});
