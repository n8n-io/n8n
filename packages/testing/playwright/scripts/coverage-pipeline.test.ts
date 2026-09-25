import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { CoverageReport } from 'monocart-coverage-reports';
import { describe, expect, it } from 'vitest';

import { BY_SPEC_DIR, bySpecDir, coverageOptions } from '../coverage-options';

/** Is `child` the same as, or nested under, `parent`? */
const isUnder = (child: string, parent: string): boolean => {
	const c = resolve(child);
	const p = resolve(parent);
	return c === p || c.startsWith(`${p}/`);
};

/**
 * Regression guard for the per-spec coverage seam (DEVP-205).
 *
 * Bug: the fixture wrote per-spec raw under `./coverage/.by-spec`, but the shard
 * report's `CoverageReport.generate()` cleans its `outputDir` (deleting every
 * child except `.cache`/the V8 dir) — so the per-spec raw was wiped before the
 * emitter read it, and the impact map came out empty. The fix puts per-spec raw
 * in a SIBLING of `outputDir`. These tests fail if it ever drifts back inside.
 */
describe('per-spec coverage dir does not drift under the report outputDir', () => {
	it('bySpecDir is OUTSIDE the report outputDir for any outputDir', () => {
		expect(isUnder(BY_SPEC_DIR, coverageOptions.outputDir ?? './coverage')).toBe(false);
		for (const out of ['./coverage', '/a/b/coverage', 'cov/', './nested/cov']) {
			expect(isUnder(bySpecDir(out), out)).toBe(false);
		}
	});

	it("the shard report's generate() does NOT delete the per-spec sibling dir", async () => {
		const tmp = resolve('/tmp', `cov-drift-${process.pid}`);
		rmSync(tmp, { recursive: true, force: true });
		const outputDir = join(tmp, 'coverage');
		const sibling = bySpecDir(outputDir);
		mkdirSync(join(sibling, 'specA'), { recursive: true });
		writeFileSync(join(sibling, 'specA', '.spec'), 'tests/e2e/x.spec.ts');

		// Minimal real coverage so generate() produces a report and runs its clean
		// (the clean is what deleted the per-spec dir when it lived under outputDir).
		const report = new CoverageReport({ ...coverageOptions, outputDir });
		await report.add([
			{
				url: 'http://host/assets/a.js',
				source: 'function f(){ return 1; }\nf();\n',
				functions: [
					{
						functionName: 'f',
						isBlockCoverage: true,
						ranges: [{ startOffset: 0, endOffset: 30, count: 1 }],
					},
				],
			},
		] as never);
		await report.generate();

		expect(existsSync(join(sibling, 'specA', '.spec'))).toBe(true);
		rmSync(tmp, { recursive: true, force: true });
	});
});
