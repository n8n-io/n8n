/**
 * Per-spec BACKEND lcov emitter (DEVP-370) — the backend counterpart of
 * emit-spec-lcovs.ts.
 *
 * Reads the per-spec backend raw V8 the coverage fixture wrote under
 * BACKEND_BY_SPEC_DIR (one `{result}` per test, tagged with a `.spec` marker),
 * resolves each entry's dist URL to the checkout's `packages/<x>/src/*.ts` (the
 * same resolution the shard emitter uses), and emits one lcov per spec tagged
 * with the spec id in `TN:`. These join the frontend per-spec lcovs in
 * `coverage/by-spec/` so the impact map attributes backend source files to the
 * specs that exercise them. The boot coverage of each n8n process is emitted as
 * the spec `BOOT_SPEC`.
 *
 * Thin wrapper over the generic @n8n/test-impact build kernel; the n8n-specific
 * dist→source resolution is injected via `feedRaws`. Best-effort: a spec with no
 * resolvable backend coverage is skipped (fail-open).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { BOOT_SPEC, emitPerSpecLcovs } from '@n8n/test-impact';
import type { CoverageReport } from 'monocart-coverage-reports';

import {
	addMissingRootRanges,
	buildPackageMap,
	collectRootRanges,
	createBackendResolveStats,
	formatBackendStats,
	listJsonFiles,
	resolveBackendEntries,
} from './backend-coverage-resolver';
import { BACKEND_BOOT_DIR, BACKEND_BY_SPEC_DIR, coverageOptions } from '../coverage-options';

const OUT_DIR = join(coverageOptions.outputDir ?? './coverage', 'by-spec');

async function main() {
	const pkgMap = buildPackageMap();
	const stats = createBackendResolveStats();
	// Every coverage window of the shard, so a script that loaded between specs
	// still has its root range. Without the coverage dir, use the spec raws.
	const windowsDir = process.env.N8N_COVERAGE_DIR;
	const rootsDir = windowsDir && existsSync(windowsDir) ? windowsDir : BACKEND_BY_SPEC_DIR;
	const roots = collectRootRanges(existsSync(rootsDir) ? listJsonFiles(rootsDir) : []);
	if (existsSync(BACKEND_BOOT_DIR)) writeFileSync(join(BACKEND_BOOT_DIR, '.spec'), BOOT_SPEC);

	const emit = await emitPerSpecLcovs({
		bySpecDir: BACKEND_BY_SPEC_DIR,
		outDir: OUT_DIR,
		coverageOptions,
		suffix: '-backend',
		feedRaws: async (report: CoverageReport, rawFiles, dir) => {
			let added = 0;
			for (const rf of rawFiles) {
				let parsed: { result?: Array<{ url: string }> };
				try {
					parsed = JSON.parse(readFileSync(join(dir, rf), 'utf8'));
				} catch {
					continue;
				}
				const result = addMissingRootRanges(parsed.result ?? [], roots);
				const entries = resolveBackendEntries({ result }, pkgMap, stats);
				if (entries.length) {
					await report.add(entries as never);
					added += entries.length;
				}
			}
			return added > 0;
		},
	});

	console.log(
		`emit-spec-backend-lcovs: ${emit.dirs} dirs → ${emit.emitted} per-spec backend lcov(s) in ${OUT_DIR} ` +
			`(${formatBackendStats(stats)})`,
	);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
