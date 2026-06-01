/**
 * Generate the unified V8 coverage report (frontend + backend).
 *
 * - Frontend: browser V8 from page.coverage, already added to outputDir/.cache
 *   by the v8-coverage fixture during the run.
 * - Backend: Node V8 from containerised n8n (NODE_V8_COVERAGE bind-mounted to
 *   N8N_COVERAGE_DIR). Container dist paths are rewritten to the repo's own
 *   byte-identical dist so monocart resolves them against the local .js + .map.
 *
 * Both are merged by a single generate() into one lcov/html keyed on
 * `packages/.../src/...`.
 */
import { existsSync, readdirSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { CoverageReport } from 'monocart-coverage-reports';

import { coverageOptions } from '../coverage-options';

const REPO_ROOT = resolve(process.cwd(), '../../..');

/** Map workspace package name → repo dir (e.g. n8n-core → core, n8n → cli). */
function buildPackageMap(): Map<string, string> {
	const map = new Map<string, string>();
	const roots = [
		join(REPO_ROOT, 'packages'),
		join(REPO_ROOT, 'packages/@n8n'),
		join(REPO_ROOT, 'packages/frontend'),
	];
	for (const root of roots) {
		if (!existsSync(root)) continue;
		for (const entry of readdirSync(root)) {
			const pkgJson = join(root, entry, 'package.json');
			if (!existsSync(pkgJson)) continue;
			try {
				const name = JSON.parse(readFileSync(pkgJson, 'utf8')).name as string;
				if (name) map.set(name, join(root, entry).slice(REPO_ROOT.length + 1));
			} catch {
				/* skip */
			}
		}
	}
	return map;
}

/** Rewrite an in-container dist url to the repo's equivalent dist file path. */
function rewriteToRepoDist(url: string, pkgMap: Map<string, string>): string | null {
	const m = url.match(/\/node_modules\/((?:@[^/]+\/)?[^/]+)\/dist\/(.+)$/);
	if (!m) return null;
	const dir = pkgMap.get(m[1]);
	if (!dir) return null;
	const abs = join(REPO_ROOT, dir, 'dist', m[2]);
	return existsSync(abs) ? abs : null;
}

function listJsonFiles(dir: string): string[] {
	const out: string[] = [];
	for (const e of readdirSync(dir)) {
		const p = join(dir, e);
		if (statSync(p).isDirectory()) out.push(...listJsonFiles(p));
		else if (e.endsWith('.json')) out.push(p);
	}
	return out;
}

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
		const entries = (parsed.result ?? [])
			.map((e) => {
				const abs = rewriteToRepoDist(e.url, pkgMap);
				if (!abs) return null;
				// Raw Node V8 entries carry no source; monocart needs it. And it
				// only resolves INLINE maps (the frontend bundle uses inline) — the
				// backend tsc build emits external .js.map, which MCR won't fetch
				// programmatically. So read the .js and splice its .map in as an
				// inline data-URI so coverage maps to .ts, not dist .js.
				let source: string;
				try {
					source = readFileSync(abs, 'utf8');
				} catch {
					return null;
				}
				try {
					const map = JSON.parse(readFileSync(`${abs}.map`, 'utf8')) as { sources?: string[] };
					// Resolve the map's relative sources to absolute repo paths so the
					// owning package is unambiguous (info.distFile is undefined here).
					const distDir = dirname(abs);
					map.sources = (map.sources ?? []).map((s) => resolve(distDir, s));
					const b64 = Buffer.from(JSON.stringify(map)).toString('base64');
					source =
						source.replace(/\n?\/\/# sourceMappingURL=.*\s*$/, '\n') +
						`//# sourceMappingURL=data:application/json;charset=utf-8;base64,${b64}\n`;
				} catch {
					return null; // no map → can't attribute to source; drop
				}
				return { ...e, url: pathToFileURL(abs).href, source };
			})
			.filter(Boolean);
		if (entries.length) {
			await report.add(entries as never);
			added += entries.length;
		}
	}
	return added;
}

/**
 * MCR's generate() hard-aborts on the first unparseable raw JSON. A test or
 * container killed mid-write (e.g. a failed shard) can leave a coverage file
 * truncated at a buffer boundary, so drop any raw cache file that won't parse —
 * one corrupt file from one failed shard must not sink the whole report.
 */
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
	console.log('🔍 Generating unified V8 coverage report...');
	const report = new CoverageReport(coverageOptions);

	const dropped = pruneCorruptRaw(join(coverageOptions.outputDir ?? './coverage', '.cache'));
	if (dropped)
		console.warn(`  ⚠ dropped ${dropped} corrupt raw coverage file(s) (truncated mid-write)`);

	const backend = await addBackendCoverage(report);
	if (backend) console.log(`  + ${backend} backend V8 script entries (rewritten to repo dist)`);

	const result = await report.generate();
	if (!result || !result.files?.length) {
		console.error('❌ No coverage data found. Run tests with COVERAGE_ENABLED=true first.');
		process.exit(1);
	}
	console.log(
		`✅ Coverage report written to ${coverageOptions.outputDir} (${result.files.length} files)`,
	);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
