/**
 * Shard-side coverage emitter (shard-side compaction, DEVP-205).
 *
 * Resolves THIS shard's own raw V8 to a small per-shard lcov, so shards upload
 * ~0.4MB of lcov instead of ~5GB of raw, and the aggregate merges lcovs in
 * bounded memory instead of OOMing on the full-suite raw merge.
 *
 * - Frontend: browser V8 already in outputDir/.cache (inline maps w/ sources) —
 *   monocart resolves it with no extra inputs.
 * - Backend: Node V8 from the containers (N8N_COVERAGE_DIR). The repo isn't
 *   built on the shard, so .js/.map BYTES are read from the n8n image's dist
 *   (docker cp'd to IMAGE_DIST_ROOT — the exact executed files), while the map's
 *   `sources` are resolved to the checkout's `packages/<x>/src/*.ts`. No build.
 *
 * Per-shard volume (~1/8 of the suite) fits in memory, so MCR's generate() is
 * safe here; the OOM only happened when merging all shards at once.
 */
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

import { CoverageReport } from 'monocart-coverage-reports';

import {
	buildPackageMap,
	createBackendResolveStats,
	formatBackendStats,
	listJsonFiles,
	resolveBackendEntries,
} from './backend-coverage-resolver';
import { coverageOptions } from '../coverage-options';

const IMAGE_DIST_ROOT = process.env.IMAGE_DIST_ROOT;

const stats = createBackendResolveStats();

async function addBackendCoverage(report: CoverageReport): Promise<number> {
	const dir = process.env.N8N_COVERAGE_DIR;
	if (!dir || !existsSync(dir)) return 0;
	const pkgMap = buildPackageMap();
	let added = 0;
	for (const file of listJsonFiles(dir)) {
		let parsed: { result?: Array<{ url: string }> };
		try {
			parsed = JSON.parse(readFileSync(file, 'utf8'));
		} catch {
			continue;
		}
		const entries = resolveBackendEntries(parsed, pkgMap, stats);
		if (entries.length) {
			await report.add(entries as never);
			added += entries.length;
		}
	}
	return added;
}

/** Drop raw cache files truncated mid-write (a killed test/container) so MCR's
 * generate() — which hard-aborts on the first unparseable file — survives. */
function pruneCorruptRaw(dir: string): number {
	if (!existsSync(dir)) return 0;
	let dropped = 0;
	for (const file of listJsonFiles(dir)) {
		try {
			JSON.parse(readFileSync(file, 'utf8'));
		} catch {
			unlinkSync(file);
			dropped++;
		}
	}
	return dropped;
}

async function main() {
	console.log('🔍 Emitting per-shard coverage lcov...');
	if (IMAGE_DIST_ROOT) console.log(`  image dist: ${IMAGE_DIST_ROOT}`);
	const report = new CoverageReport(coverageOptions);

	const dropped = pruneCorruptRaw(join(coverageOptions.outputDir ?? './coverage', '.cache'));
	if (dropped) console.warn(`  ⚠ dropped ${dropped} corrupt raw coverage file(s)`);

	const backend = await addBackendCoverage(report);
	console.log(`  backend entries: ${formatBackendStats(stats)}`);

	const result = await report.generate();
	if (!result || !result.files?.length) {
		console.error('❌ No coverage data resolved for this shard.');
		process.exit(1);
	}
	console.log(
		`✅ Per-shard lcov written (${result.files.length} files, ${backend} backend entries)`,
	);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
