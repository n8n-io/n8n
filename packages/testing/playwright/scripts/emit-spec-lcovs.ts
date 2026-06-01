/**
 * Resolve per-spec frontend coverage (collected by the v8-coverage fixture into
 * coverage/.by-spec/<slug>/) into one lcov per spec, tagged with the spec id in
 * `TN:`. These feed the bidirectional impact map (merge-coverage), which is what
 * lets a git diff select the E2E specs that exercise the touched frontend code.
 *
 * Frontend only by design: backend coverage is a shared, worker-scoped process
 * with no per-test boundary, so it stays at report granularity (a backend change
 * resolves broad). See DEVP-205.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { CoverageReport } from 'monocart-coverage-reports';

import { coverageOptions } from '../coverage-options';

const BASE = coverageOptions.outputDir ?? './coverage';
const BY_SPEC_RAW = join(BASE, '.by-spec');
const OUT_DIR = join(BASE, 'by-spec');

async function main() {
	if (!existsSync(BY_SPEC_RAW)) {
		console.log('emit-spec-lcovs: no per-spec coverage collected (nothing to do)');
		return;
	}
	mkdirSync(OUT_DIR, { recursive: true });
	const slugs = readdirSync(BY_SPEC_RAW).filter((d) =>
		statSync(join(BY_SPEC_RAW, d)).isDirectory(),
	);
	let emitted = 0;
	for (const slug of slugs) {
		const dir = join(BY_SPEC_RAW, slug);
		const specMarker = join(dir, '.spec');
		if (!existsSync(specMarker)) continue;
		const spec = readFileSync(specMarker, 'utf8').trim();
		// Generate lcov from this spec's accumulated raw (inline maps resolve to src).
		const report = new CoverageReport({
			...coverageOptions,
			name: spec,
			outputDir: dir,
			reports: ['lcovonly'],
		});
		const result = await report.generate();
		const lcovPath = join(dir, 'lcov.info');
		if (!result || !result.files?.length || !existsSync(lcovPath)) continue;
		// Force every record's TN to the real spec id (MCR's own TN is unreliable),
		// so the merge attributes this coverage to the spec that produced it.
		let lcov = readFileSync(lcovPath, 'utf8').replace(/^TN:.*$/gm, `TN:${spec}`);
		if (!lcov.startsWith('TN:')) lcov = `TN:${spec}\n${lcov}`;
		writeFileSync(join(OUT_DIR, `${slug}.lcov`), lcov);
		emitted++;
	}
	console.log(`emit-spec-lcovs: ${emitted} per-spec lcov(s) → ${OUT_DIR}`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
