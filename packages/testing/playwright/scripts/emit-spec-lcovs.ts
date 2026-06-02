/**
 * Resolve per-spec frontend coverage (raw page.coverage the v8-coverage fixture
 * wrote under BY_SPEC_DIR) into one lcov per spec, tagged with the spec id in
 * `TN:`. These feed the impact map, letting a git diff select the E2E specs that
 * exercise the touched frontend code.
 *
 * Frontend only: backend coverage is a shared worker-scoped process with no
 * per-test boundary, so it stays at report granularity. See DEVP-205.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { CoverageReport } from 'monocart-coverage-reports';

import { BY_SPEC_DIR, coverageOptions } from '../coverage-options';

const OUT_DIR = join(coverageOptions.outputDir ?? './coverage', 'by-spec');

async function main() {
	if (!existsSync(BY_SPEC_DIR)) {
		console.log(`emit-spec-lcovs: ${BY_SPEC_DIR} absent — no per-spec coverage collected`);
		return;
	}
	mkdirSync(OUT_DIR, { recursive: true });
	const dirs = readdirSync(BY_SPEC_DIR).filter((d) => statSync(join(BY_SPEC_DIR, d)).isDirectory());
	let withMarker = 0;
	let withRaw = 0;
	let emitted = 0;
	for (const slug of dirs) {
		const dir = join(BY_SPEC_DIR, slug);
		const specMarker = join(dir, '.spec');
		if (!existsSync(specMarker)) continue;
		withMarker++;
		const spec = readFileSync(specMarker, 'utf8').trim();
		const rawFiles = readdirSync(dir).filter((f) => f.startsWith('raw-') && f.endsWith('.json'));
		if (!rawFiles.length) continue;
		withRaw++;
		const report = new CoverageReport({
			...coverageOptions,
			name: spec,
			outputDir: dir,
			reports: ['lcovonly'],
		});
		for (const rf of rawFiles) {
			try {
				await report.add(JSON.parse(readFileSync(join(dir, rf), 'utf8')));
			} catch (error) {
				console.warn(`  ⚠ ${slug}/${rf}: ${String(error)}`);
			}
		}
		const result = await report.generate();
		const lcovPath = join(dir, 'lcov.info');
		if (!result || !result.files?.length || !existsSync(lcovPath)) continue;
		// Force every record's TN to the real spec id so the merge attributes it.
		let lcov = readFileSync(lcovPath, 'utf8').replace(/^TN:.*$/gm, `TN:${spec}`);
		if (!lcov.startsWith('TN:')) lcov = `TN:${spec}\n${lcov}`;
		writeFileSync(join(OUT_DIR, `${slug}.lcov`), lcov);
		emitted++;
	}
	console.log(
		`emit-spec-lcovs: ${dirs.length} dirs, ${withMarker} with .spec, ${withRaw} with raw → ` +
			`${emitted} per-spec lcov(s) in ${OUT_DIR}`,
	);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
