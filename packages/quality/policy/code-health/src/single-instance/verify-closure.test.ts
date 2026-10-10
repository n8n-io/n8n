import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { EXIT_DUPLICATES_FOUND, runVerifyClosure } from './verify-closure.js';

let ROOT: string;

function pkg(relDir: string, name: string, version: string): void {
	const dir = join(ROOT, relDir);
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, version }));
}

beforeAll(() => {
	ROOT = mkdtempSync(join(tmpdir(), 'verify-closure-fixture-'));

	pkg('clean/node_modules/zod', 'zod', '4.0.0');

	// zod is curated and not allowlisted, so a second physical copy is a failure.
	pkg('dirty/node_modules/zod', 'zod', '4.0.0');
	pkg('dirty/node_modules/a', 'a', '1.0.0');
	pkg('dirty/node_modules/a/node_modules/zod', 'zod', '3.0.0');

	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
	vi.restoreAllMocks();
	rmSync(ROOT, { recursive: true, force: true });
});

describe('runVerifyClosure', () => {
	it('exits 0 when every curated library resolves to one copy', () => {
		expect(runVerifyClosure(join(ROOT, 'clean'))).toBe(0);
	});

	it('exits EXIT_DUPLICATES_FOUND when a curated library is duplicated', () => {
		expect(runVerifyClosure(join(ROOT, 'dirty'))).toBe(EXIT_DUPLICATES_FOUND);
	});

	// build-n8n.mjs reads the exit code to tell "found duplicates" apart from "never ran". A
	// missing package or an unresolvable import also exits 1, so the finding must not use 1.
	it('does not signal a finding with an exit code a failed toolchain also produces', () => {
		expect(EXIT_DUPLICATES_FOUND).not.toBe(0);
		expect(EXIT_DUPLICATES_FOUND).not.toBe(1);
		expect(EXIT_DUPLICATES_FOUND).not.toBe(2);
	});
});
