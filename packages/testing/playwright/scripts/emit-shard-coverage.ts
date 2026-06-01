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
import { existsSync, readdirSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { CoverageReport } from 'monocart-coverage-reports';

import { coverageOptions } from '../coverage-options';

const REPO_ROOT = resolve(process.cwd(), '../../..');
// Where `docker cp` placed the image's n8n package tree, and the in-image root
// those urls are prefixed with (see docker/images/n8n/Dockerfile).
const IMAGE_DIST_ROOT = process.env.IMAGE_DIST_ROOT;
const IMAGE_ROOT_PREFIX = process.env.IMAGE_ROOT_PREFIX ?? '/usr/local/lib/node_modules/n8n';

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

function listJsonFiles(dir: string): string[] {
	const out: string[] = [];
	for (const e of readdirSync(dir)) {
		const p = join(dir, e);
		if (statSync(p).isDirectory()) out.push(...listJsonFiles(p));
		else if (e.endsWith('.json')) out.push(p);
	}
	return out;
}

/** A resolved backend entry: where to read .js/.map bytes, and the repo dist
 * dir its map sources resolve against (→ checkout `src/*.ts`). */
function resolveBackendUrl(url: string, pkgMap: Map<string, string>) {
	const m = url.match(/\/node_modules\/((?:@[^/]+\/)?[^/]+)\/dist\/(.+)$/);
	if (!m) return null;
	const repoDir = pkgMap.get(m[1]);
	if (!repoDir) return null;
	const repoDistDir = join(REPO_ROOT, repoDir, 'dist');
	const repoDistFile = join(repoDistDir, m[2]);
	// Byte source: image dist on the shard (prefix-remap), or repo dist locally.
	const bytesFile = IMAGE_DIST_ROOT
		? url.replace(/^file:\/\//, '').replace(IMAGE_ROOT_PREFIX, IMAGE_DIST_ROOT)
		: repoDistFile;
	return { repoDistDir, repoDistFile, bytesFile };
}

const stats = { entries: 0, noMatch: 0, noPkg: 0, noJs: 0, noMap: 0, ok: 0 };

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
				stats.entries++;
				const r = resolveBackendUrl(e.url, pkgMap);
				if (!r) {
					if (/\/node_modules\/.+\/dist\//.test(e.url)) stats.noPkg++;
					else stats.noMatch++;
					return null;
				}
				let source: string;
				try {
					source = readFileSync(r.bytesFile, 'utf8');
				} catch {
					stats.noJs++;
					return null;
				}
				try {
					const map = JSON.parse(readFileSync(`${r.bytesFile}.map`, 'utf8')) as {
						sources?: string[];
					};
					// Resolve map sources to the checkout's repo src/*.ts (absolute).
					// Sources are relative to the .js.map's OWN dir (e.g. a file at
					// dist/commands/x.js.map has `../../src/commands/x.ts`), so anchor
					// at the dist file's dir — not the package dist root.
					map.sources = (map.sources ?? []).map((s) => resolve(dirname(r.repoDistFile), s));
					const b64 = Buffer.from(JSON.stringify(map)).toString('base64');
					source =
						source.replace(/\n?\/\/# sourceMappingURL=.*\s*$/, '\n') +
						`//# sourceMappingURL=data:application/json;charset=utf-8;base64,${b64}\n`;
				} catch {
					stats.noMap++;
					return null;
				}
				stats.ok++;
				// Key on the repo dist path so entryFilter (/packages/.../dist/) matches.
				return { ...e, url: pathToFileURL(r.repoDistFile).href, source };
			})
			.filter(Boolean);
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
	console.log(
		`  backend entries: ${stats.entries} seen → ${stats.ok} resolved ` +
			`(noPkg ${stats.noPkg}, noJs ${stats.noJs}, noMap ${stats.noMap}, other ${stats.noMatch})`,
	);

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
