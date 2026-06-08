/**
 * Per-spec BACKEND lcov emitter (DEVP-370) — the backend counterpart of
 * emit-spec-lcovs.ts.
 *
 * Reads the per-spec backend raw V8 the coverage fixture wrote under
 * BACKEND_BY_SPEC_DIR (one `{result}` per test, tagged with a `.spec` marker),
 * resolves each entry's dist URL to the checkout's `packages/<x>/src/*.ts` (the
 * same resolution the shard emitter uses), and emits one lcov per spec tagged
 * with the spec id in `TN:`. These join the frontend per-spec lcovs in
 * `coverage/by-spec/` and let the impact map attribute backend source files to
 * the specs that exercise them — so a backend change selects E2E specs instead
 * of running the whole suite.
 *
 * Best-effort: a spec with no resolvable backend coverage is simply skipped
 * (fail-open — no backend rows, never a failure).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { CoverageReport } from 'monocart-coverage-reports';

import {
	buildPackageMap,
	createBackendResolveStats,
	forceSpecTn,
	formatBackendStats,
	resolveBackendEntries,
} from './backend-coverage-resolver';
import { BACKEND_BY_SPEC_DIR, coverageOptions } from '../coverage-options';

const OUT_DIR = join(coverageOptions.outputDir ?? './coverage', 'by-spec');

async function main() {
	if (!existsSync(BACKEND_BY_SPEC_DIR)) {
		console.log(`emit-spec-backend-lcovs: ${BACKEND_BY_SPEC_DIR} absent — no per-spec backend raw`);
		return;
	}
	mkdirSync(OUT_DIR, { recursive: true });
	const pkgMap = buildPackageMap();
	const stats = createBackendResolveStats();
	const dirs = readdirSync(BACKEND_BY_SPEC_DIR).filter((d) =>
		statSync(join(BACKEND_BY_SPEC_DIR, d)).isDirectory(),
	);
	let emitted = 0;
	for (const slug of dirs) {
		const dir = join(BACKEND_BY_SPEC_DIR, slug);
		const specMarker = join(dir, '.spec');
		if (!existsSync(specMarker)) continue;
		const spec = readFileSync(specMarker, 'utf8').trim();
		const rawFiles = readdirSync(dir).filter((f) => f.startsWith('raw-') && f.endsWith('.json'));
		if (!rawFiles.length) continue;

		const report = new CoverageReport({
			...coverageOptions,
			name: spec,
			outputDir: dir,
			reports: ['lcovonly'],
		});
		let added = 0;
		for (const rf of rawFiles) {
			let parsed: { result?: Array<{ url: string }> };
			try {
				parsed = JSON.parse(readFileSync(join(dir, rf), 'utf8'));
			} catch {
				continue;
			}
			const entries = resolveBackendEntries(parsed, pkgMap, stats);
			if (entries.length) {
				await report.add(entries as never);
				added += entries.length;
			}
		}
		if (!added) continue;

		const result = await report.generate();
		const lcovPath = join(dir, 'lcov.info');
		if (!result || !result.files?.length || !existsSync(lcovPath)) continue;
		// Force every record's TN to the real spec id so the merge attributes it.
		const lcov = forceSpecTn(readFileSync(lcovPath, 'utf8'), spec);
		writeFileSync(join(OUT_DIR, `${slug}-backend.lcov`), lcov);
		emitted++;
	}
	console.log(
		`emit-spec-backend-lcovs: ${dirs.length} dirs → ${emitted} per-spec backend lcov(s) in ${OUT_DIR} ` +
			`(${formatBackendStats(stats)})`,
	);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
