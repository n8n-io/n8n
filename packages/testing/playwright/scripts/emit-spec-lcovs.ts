/**
 * Resolve per-spec frontend coverage (raw page.coverage the v8-coverage fixture
 * wrote under BY_SPEC_DIR) into one lcov per spec, tagged with the spec id in
 * `TN:`. These feed the impact map, letting a git diff select the E2E specs that
 * exercise the touched frontend code.
 *
 * Thin wrapper: the generic build kernel lives in @n8n/test-impact; this script
 * supplies the n8n-specific input dir + monocart coverage options, and feeds the
 * raw page.coverage directly into the report.
 *
 * Frontend only: backend coverage is a shared worker-scoped process with no
 * per-test boundary, so it stays at report granularity. See DEVP-205.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { emitPerSpecLcovs } from '@n8n/test-impact';
import type { CoverageReport } from 'monocart-coverage-reports';

import { BY_SPEC_DIR, coverageOptions } from '../coverage-options';

const OUT_DIR = join(coverageOptions.outputDir ?? './coverage', 'by-spec');

async function main() {
	const stats = await emitPerSpecLcovs({
		bySpecDir: BY_SPEC_DIR,
		outDir: OUT_DIR,
		coverageOptions,
		feedRaws: async (report: CoverageReport, rawFiles, dir) => {
			for (const rf of rawFiles) {
				try {
					await report.add(JSON.parse(readFileSync(join(dir, rf), 'utf8')));
				} catch (error) {
					console.warn(`  ⚠ ${rf}: ${String(error)}`);
				}
			}
			return true;
		},
	});
	console.log(
		`emit-spec-lcovs: ${stats.dirs} dirs, ${stats.withMarker} with .spec, ${stats.withRaw} with raw → ` +
			`${stats.emitted} per-spec lcov(s) in ${OUT_DIR}`,
	);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
