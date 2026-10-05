import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// @ts-expect-error — JS module without types; runtime export is what we test.
import { buildArgs, resolveMapPath } from './select-affected-e2e.mjs';

// The wrapper is the bridge between CI (raw changed-files list) and janitor
// select. Its only job is to keep selection FAIL-OPEN: any failure in
// locating the map must degrade to broad — never throw, never hide selection.

describe('select-affected-e2e wrapper — fail-open contract', () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'select-wrapper-')));
	});

	afterEach(() => {
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	describe('resolveMapPath()', () => {
		it('returns null when the committed map is missing (wrapper degrades to broad)', () => {
			const missing = path.join(tempDir, 'never-existed.json');
			expect(resolveMapPath({ mapPath: missing })).toBeNull();
		});

		it('returns the path when the map exists and is readable', () => {
			const p = path.join(tempDir, 'present.json');
			fs.writeFileSync(p, '{}');
			expect(resolveMapPath({ mapPath: p })).toBe(p);
		});

		it('returns null on an unreadable map (e.g. perms), never throws', () => {
			// On non-root environments chmod 000 makes accessSync(R_OK) throw.
			// Skip the assertion on root (CI sometimes runs as root and can read anything).
			if (process.getuid?.() === 0) return;
			const p = path.join(tempDir, 'unreadable.json');
			fs.writeFileSync(p, '{}');
			fs.chmodSync(p, 0o000);
			try {
				expect(resolveMapPath({ mapPath: p })).toBeNull();
			} finally {
				fs.chmodSync(p, 0o644);
			}
		});
	});

	describe('buildArgs()', () => {
		// Omitting --map is exactly how the wrapper signals fail-open broad to
		// the janitor CLI — assert by absence, not by a placeholder value.
		it('omits --map when mapPath is null (fail-open broad)', () => {
			const args = buildArgs({ changedFiles: 'a.ts,b.ts', mapPath: null });
			expect(args).toEqual(['select', '--changed-files=a.ts,b.ts']);
			expect(args.some((a: string) => a.startsWith('--map='))).toBe(false);
		});

		it('passes --map and --all-specs through when provided', () => {
			expect(
				buildArgs({ changedFiles: 'a.ts', mapPath: '/tmp/m.json', allSpecs: '/tmp/s.txt' }),
			).toEqual(['select', '--changed-files=a.ts', '--map=/tmp/m.json', '--all-specs=/tmp/s.txt']);
		});
	});
});
