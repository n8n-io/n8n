import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { analyze, collectCopies, distinctCopies } from './collect-copies.js';

// Build a planted install tree on disk so the walk (collectCopies) is exercised, not just the
// pure analyze() core. `node_modules` dirs are gitignored, so we construct the tree in a temp dir.
let ROOT: string;

function pkg(relDir: string, name: string, version: string): void {
	const dir = join(ROOT, relDir);
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, version }));
}

let planted: ReturnType<typeof collectCopies>;
let clean: ReturnType<typeof collectCopies>;

beforeAll(() => {
	ROOT = mkdtempSync(join(tmpdir(), 'collect-copies-fixture-'));

	// two copies of zod (curated, NOT allowlisted) -> FAIL
	pkg('planted/node_modules/zod', 'zod', '1.0.0');
	pkg('planted/node_modules/a', 'a', '1.0.0');
	pkg('planted/node_modules/a/node_modules/zod', 'zod', '2.0.0');
	// two copies of @langchain/core (curated) -> used for the allowlist case
	pkg('planted/node_modules/@langchain/core', '@langchain/core', '1.0.0');
	pkg('planted/node_modules/b', 'b', '1.0.0');
	pkg('planted/node_modules/b/node_modules/@langchain/core', '@langchain/core', '2.0.0');
	// two copies of lodash (non-curated) -> report only, never fails
	pkg('planted/node_modules/lodash', 'lodash', '1.0.0');
	pkg('planted/node_modules/c', 'c', '1.0.0');
	pkg('planted/node_modules/c/node_modules/lodash', 'lodash', '2.0.0');
	// single copy of each curated lib -> passes
	pkg('clean/node_modules/zod', 'zod', '1.0.0');
	pkg('clean/node_modules/@langchain/core', '@langchain/core', '1.0.0');

	planted = collectCopies(join(ROOT, 'planted'));
	clean = collectCopies(join(ROOT, 'clean'));
});

afterAll(() => rmSync(ROOT, { recursive: true, force: true }));

describe('collectCopies + analyze', () => {
	it('fails on planted duplicates of non-allowlisted curated libs', () => {
		const { failures } = analyze(planted);
		expect(failures.map((f) => f.name).sort()).toEqual(['@langchain/core', 'zod']);
	});

	it('reports but does not fail on an allowlisted curated duplicate', () => {
		const { duplicates, failures } = analyze(planted, {
			allowlist: { '@langchain/core': 'test-only allowlist entry' },
		});
		expect(duplicates.find((d) => d.name === '@langchain/core')?.allowed).toBe(true);
		expect(failures.some((f) => f.name === '@langchain/core')).toBe(false);
		expect(failures.some((f) => f.name === 'zod')).toBe(true);
	});

	it('reports non-curated duplicates without failing on them', () => {
		const { duplicates, failures } = analyze(planted);
		const lodash = duplicates.find((d) => d.name === 'lodash');
		expect(lodash && !lodash.isCurated).toBe(true);
		expect(failures.some((f) => f.name === 'lodash')).toBe(false);
	});

	it('passes a clean tree with a single copy of each curated lib', () => {
		const { duplicates, failures } = analyze(clean);
		expect(duplicates).toHaveLength(0);
		expect(failures).toHaveLength(0);
	});
});

// `"zod-v3": "npm:zod@^3"` installs a real second copy of zod under a directory named `zod-v3`.
// Identifying copies by directory would leave it out of duplicate detection.
describe('npm rename aliases', () => {
	it('counts an aliased copy under the name in its manifest', () => {
		pkg('aliased/node_modules/zod', 'zod', '4.0.0');
		pkg('aliased/node_modules/zod-v3', 'zod', '3.0.0');

		const found = collectCopies(join(ROOT, 'aliased'));

		expect(found.get('zod-v3')).toBeUndefined();
		expect(
			distinctCopies(found.get('zod') ?? [])
				.map((c) => c.version)
				.sort(),
		).toEqual(['3.0.0', '4.0.0']);
		expect(analyze(found).failures.map((f) => f.name)).toEqual(['zod']);
	});

	it('ignores a directory whose manifest has no name', () => {
		mkdirSync(join(ROOT, 'nameless/node_modules/mystery'), { recursive: true });
		writeFileSync(join(ROOT, 'nameless/node_modules/mystery/package.json'), '{"version":"1.0.0"}');

		expect(collectCopies(join(ROOT, 'nameless')).size).toBe(0);
	});
});

describe('unusable closure', () => {
	// Reporting "no duplicates" for a tree that was never read is the worst outcome for this check,
	// so callers get a throw (read as "did not run") rather than a clean verdict.
	it('throws instead of reporting a clean result when the root has no node_modules', () => {
		mkdirSync(join(ROOT, 'empty'), { recursive: true });

		expect(() => collectCopies(join(ROOT, 'empty'))).toThrow(/No node_modules/);
		expect(() => collectCopies(join(ROOT, 'does-not-exist'))).toThrow(/nothing was verified/);
	});

	it('throws when node_modules exists but is not a directory', () => {
		mkdirSync(join(ROOT, 'nm-is-a-file'), { recursive: true });
		writeFileSync(join(ROOT, 'nm-is-a-file/node_modules'), 'not a directory');

		expect(() => collectCopies(join(ROOT, 'nm-is-a-file'))).toThrow(/No node_modules directory/);
	});
});

// Exercises the pnpm-shaped layout the tool actually runs against: the physical copy lives under
// the `.pnpm` virtual store and is symlinked to `node_modules/<pkg>`. This is what the `.pnpm` walk
// (walkPnpmStore) and the realpath dedup exist for — a single physical copy reached via a symlink
// alias must count once, not as a second copy.
describe('collectCopies on a pnpm-style store', () => {
	let root: string;

	function storePkg(nm: string, key: string, name: string, version: string): string {
		const dir = join(nm, '.pnpm', key, 'node_modules', name);
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, version }));
		return dir;
	}

	afterAll(() => rmSync(root, { recursive: true, force: true }));

	beforeAll(() => {
		root = mkdtempSync(join(tmpdir(), 'collect-copies-pnpm-'));
		const nm = join(root, 'node_modules');
		// one physical zod in the store, symlinked to the top level (the normal single-copy case)
		const zodReal = storePkg(nm, 'zod@1.0.0', 'zod', '1.0.0');
		symlinkSync(zodReal, join(nm, 'zod'));
		// two physical copies of form-data in the store (distinct realpaths → a real duplicate)
		storePkg(nm, 'form-data@1.0.0', 'form-data', '1.0.0');
		const fdReal = storePkg(nm, 'form-data@2.0.0', 'form-data', '2.0.0');
		symlinkSync(fdReal, join(nm, 'form-data'));
	});

	it('counts a store copy reached via a top-level symlink alias only once', () => {
		const found = collectCopies(root);
		expect(distinctCopies(found.get('zod') ?? [])).toHaveLength(1);
		expect(analyze(found).failures.some((f) => f.name === 'zod')).toBe(false);
	});

	it('fails on two distinct physical copies in the store despite a symlink alias', () => {
		expect(analyze(collectCopies(root)).failures.map((f) => f.name)).toEqual(['form-data']);
	});
});
