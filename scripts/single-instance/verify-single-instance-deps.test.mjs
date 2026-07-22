import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { collectCopies, analyze } from './verify-single-instance-deps.mjs';

// Build a planted install tree on disk so the test exercises the real filesystem
// walk (collectCopies), not just the pure analyze() core. `node_modules` dirs are
// gitignored, so we can't commit fixtures — we construct the tree in a temp dir.
const ROOT = join(tmpdir(), 'verify-single-instance-fixture');

/** Write a package.json at <root>/<relDir> with the given name + version. */
function pkg(relDir, name, version) {
	const dir = join(ROOT, relDir);
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, version }));
}

// Walked once each in before(); analyze() does not mutate the returned Map, so the
// tests share these instead of re-walking the immutable fixture per assertion.
let planted;
let clean;

before(() => {
	rmSync(ROOT, { recursive: true, force: true });

	// planted/: two copies of zod (curated, NOT allowlisted) -> FAIL
	pkg('planted/node_modules/zod', 'zod', '1.0.0');
	pkg('planted/node_modules/a', 'a', '1.0.0');
	pkg('planted/node_modules/a/node_modules/zod', 'zod', '2.0.0');

	// two copies of @langchain/core (curated, allowlisted) -> ALLOWED
	pkg('planted/node_modules/@langchain/core', '@langchain/core', '1.0.0');
	pkg('planted/node_modules/b', 'b', '1.0.0');
	pkg('planted/node_modules/b/node_modules/@langchain/core', '@langchain/core', '2.0.0');

	// two copies of lodash (non-curated) -> report only, never fails
	pkg('planted/node_modules/lodash', 'lodash', '1.0.0');
	pkg('planted/node_modules/c', 'c', '1.0.0');
	pkg('planted/node_modules/c/node_modules/lodash', 'lodash', '2.0.0');

	// clean/: single copy of each curated lib -> passes
	pkg('clean/node_modules/zod', 'zod', '1.0.0');
	pkg('clean/node_modules/@langchain/core', '@langchain/core', '1.0.0');

	planted = collectCopies(join(ROOT, 'planted'));
	clean = collectCopies(join(ROOT, 'clean'));
});

after(() => rmSync(ROOT, { recursive: true, force: true }));

describe('closure verifier', () => {
	it('fails on planted duplicates of non-allowlisted curated libs', () => {
		const { failures } = analyze(planted);
		assert.deepEqual(failures.map((f) => f.name).sort(), ['@langchain/core', 'zod']);
	});

	it('reports but does not fail on an allowlisted curated duplicate', () => {
		const { duplicates, failures } = analyze(planted, {
			allowlist: { '@langchain/core': 'test-only allowlist entry' },
		});
		const langchain = duplicates.find((d) => d.name === '@langchain/core');
		assert.ok(langchain?.allowed, '@langchain/core should be allowlisted');
		assert.ok(!failures.some((f) => f.name === '@langchain/core'));
		assert.ok(failures.some((f) => f.name === 'zod'));
	});

	it('reports non-curated duplicates without failing on them', () => {
		const { duplicates, failures } = analyze(planted);
		const lodash = duplicates.find((d) => d.name === 'lodash');
		assert.ok(lodash && !lodash.isCurated);
		assert.ok(!failures.some((f) => f.name === 'lodash'));
	});

	it('passes a clean tree with a single copy of each curated lib', () => {
		const { duplicates, failures } = analyze(clean);
		assert.equal(duplicates.length, 0);
		assert.equal(failures.length, 0);
	});
});
