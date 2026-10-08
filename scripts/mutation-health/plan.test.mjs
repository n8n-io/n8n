import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { findPackageRoot, ineligibleReason, planFromTarget } from './plan.mjs';
import { MutateError, repoRoot } from './targets.mjs';

let root;

beforeEach(() => {
	root = mkdtempSync(path.join(tmpdir(), 'mutate-plan-'));
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

// A package with one source file and the given package.json fields.
function seedPackage(fields) {
	const pkgRoot = path.join(root, 'pkg');
	mkdirSync(path.join(pkgRoot, 'src'), { recursive: true });
	writeFileSync(path.join(pkgRoot, 'package.json'), JSON.stringify(fields));
	writeFileSync(path.join(pkgRoot, 'src/a.ts'), 'export const a = 1;\n');
	writeFileSync(path.join(pkgRoot, 'src/a.test.ts'), 'it("a", () => {});\n');
	return pkgRoot;
}

function assertMutateError(fn, exitCode, pattern) {
	assert.throws(fn, (error) => {
		assert.ok(error instanceof MutateError);
		assert.equal(error.exitCode, exitCode);
		assert.match(error.message, pattern);
		return true;
	});
}

describe('ineligibleReason', () => {
	it('accepts a package whose test script runs vitest', () => {
		assert.equal(
			ineligibleReason(seedPackage({ name: 'pkg', scripts: { test: 'vitest run' } })),
			null,
		);
	});

	it('refuses a package whose test script runs something else', () => {
		const reason = ineligibleReason(seedPackage({ name: 'pkg', scripts: { test: 'jest' } }));
		assert.deepEqual(reason, { code: 'not-vitest', message: 'pkg is not a vitest package' });
	});

	// The playwright package has no `test` script, only `test:unit`.
	it('accepts a package with no vitest test script once a test command is given', () => {
		const pkgRoot = seedPackage({ name: 'pkg', scripts: { 'test:unit': 'vitest run' } });
		assert.equal(ineligibleReason(pkgRoot).code, 'not-vitest');
		assert.equal(ineligibleReason(pkgRoot, { customTestCommand: true }), null);
	});

	it('refuses a package without scripts, or without a readable package.json', () => {
		assert.equal(ineligibleReason(seedPackage({ name: 'pkg' })).code, 'not-vitest');
		const bare = path.join(root, 'bare');
		mkdirSync(bare);
		assert.deepEqual(ineligibleReason(bare), {
			code: 'not-vitest',
			message: `${path.relative(repoRoot, bare)} is not a vitest package`,
		});
	});

	it('keeps a blocked package blocked, with or without a test command', () => {
		const pkgRoot = seedPackage({
			name: '@n8n/expression-runtime',
			scripts: { test: 'vitest run' },
		});
		for (const options of [{}, { customTestCommand: true }]) {
			const reason = ineligibleReason(pkgRoot, options);
			assert.equal(reason.code, 'blocked');
			assert.match(reason.message, /DEVP-257/);
		}
	});
});

describe('planFromTarget', () => {
	it('plans one job for a named target with a line range', () => {
		const pkgRoot = seedPackage({ name: 'pkg', scripts: { test: 'vitest run' } });
		const job = planFromTarget('src/a.ts:3-9', pkgRoot);
		assert.equal(job.pkgRoot, pkgRoot);
		assert.deepEqual(job.targets, ['src/a.ts:3-9']);
	});

	it('infers the package of a repo-relative target', () => {
		const job = planFromTarget('packages/@n8n/instance-ai/src/utils/model-config-id.ts');
		assert.equal(job.packageDir, path.join('packages', '@n8n', 'instance-ai'));
		assert.deepEqual(job.targets, [path.join('src', 'utils', 'model-config-id.ts')]);
	});

	it('refuses a package without a vitest test script and names --test-command', () => {
		const pkgRoot = seedPackage({ name: 'pkg', scripts: {} });
		assertMutateError(
			() => planFromTarget('src/a.ts', pkgRoot),
			2,
			/Cannot mutate src\/a\.ts: pkg is not a vitest package\n.*--test-command/,
		);
	});

	it('names the command form in the hint', () => {
		const pkgRoot = seedPackage({ name: 'pkg', scripts: {} });
		assertMutateError(
			() => planFromTarget('src/a.ts', pkgRoot),
			2,
			/\nName the command that runs its tests with --test-command, for example --test-command 'pnpm exec vitest run'\.$/,
		);
	});

	it('gives no test-command hint for a blocked package', () => {
		const pkgRoot = seedPackage({
			name: '@n8n/expression-runtime',
			scripts: { test: 'vitest run' },
		});
		assert.throws(
			() => planFromTarget('src/a.ts', pkgRoot),
			(error) => /DEVP-257\)$/.test(error.message) && !error.message.includes('--test-command'),
		);
	});

	it('plans that package once a test command is given', () => {
		const pkgRoot = seedPackage({ name: 'pkg', scripts: {} });
		const job = planFromTarget('src/a.ts', pkgRoot, { customTestCommand: true });
		assert.deepEqual(job.targets, ['src/a.ts']);
	});

	it('refuses a target outside the package, a missing one and a test file', () => {
		const pkgRoot = seedPackage({ name: 'pkg', scripts: { test: 'vitest run' } });
		assertMutateError(() => planFromTarget('../other.ts', pkgRoot), 2, /inside the package/);
		assertMutateError(() => planFromTarget('src/missing.ts', pkgRoot), 2, /Target not found/);
		assertMutateError(() => planFromTarget('src/a.test.ts', pkgRoot), 2, /Not a mutable source/);
	});

	it('stops when the package dir does not exist', () => {
		assertMutateError(
			() => planFromTarget('src/a.ts', path.join(root, 'missing')),
			2,
			/^Package dir not found: .*missing$/,
		);
	});

	it('asks for --package-dir when no package holds the target', () => {
		writeFileSync(path.join(root, 'loose.ts'), 'export const a = 1;\n');
		assert.throws(
			() => planFromTarget(path.join(root, 'loose.ts')),
			(error) =>
				error.exitCode === 2 &&
				error.showUsage === true &&
				/^Could not infer the package for .*loose\.ts — pass --package-dir\.$/.test(error.message),
		);
	});

	it('asks for the usage text when it cannot find the target to infer a package', () => {
		assert.throws(
			() => planFromTarget('packages/no-such-package/src/a.ts'),
			(error) =>
				error.exitCode === 2 &&
				error.showUsage === true &&
				/^Target not found: .*packages\/no-such-package\/src\/a\.ts$/.test(error.message),
		);
	});
});

describe('findPackageRoot', () => {
	it('finds the nearest package.json above a file', () => {
		const file = path.join(repoRoot, 'packages/@n8n/instance-ai/src/utils/model-config-id.ts');
		assert.equal(findPackageRoot(file), path.join(repoRoot, 'packages/@n8n/instance-ai'));
	});

	it('finds the repo root for a file at the top of the repo', () => {
		assert.equal(findPackageRoot(path.join(repoRoot, 'knip.ts')), repoRoot);
	});

	// A package outside the repo is never planned.
	it('does not look outside the repo', () => {
		seedPackage({ name: 'pkg', scripts: { test: 'vitest run' } });
		assert.equal(findPackageRoot(path.join(root, 'pkg/src/a.ts')), null);
	});
});
