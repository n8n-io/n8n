/**
 * Shared backend V8 coverage resolution (DEVP-205 / DEVP-370).
 *
 * Backend coverage is raw Node V8 from the n8n container(s). The repo isn't
 * built on the shard, so the `.js`/`.map` BYTES are read from the n8n image's
 * dist (docker cp'd to IMAGE_DIST_ROOT — the exact executed files), while the
 * map's `sources` are resolved to the checkout's `packages/<x>/src/*.ts`.
 *
 * Used by BOTH:
 *  - emit-shard-coverage.ts  → shard-level unified lcov (whole-container V8)
 *  - emit-spec-backend-lcovs.ts → per-spec backend lcovs for the impact map
 *
 * Both consume the same V8 shape (`{ result: [{ url, functions/ranges }] }`),
 * whether it came from a NODE_V8_COVERAGE file or the e2e `/coverage/take` hook.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const REPO_ROOT = resolve(process.cwd(), '../../..');
// Where `docker cp` placed the image's n8n package tree, and the in-image root
// those urls are prefixed with (see docker/images/n8n/Dockerfile).
const IMAGE_DIST_ROOT = process.env.IMAGE_DIST_ROOT;
const IMAGE_ROOT_PREFIX = process.env.IMAGE_ROOT_PREFIX ?? '/usr/local/lib/node_modules/n8n';

/** Map workspace package name → repo dir (e.g. n8n-core → core, n8n → cli). */
export function buildPackageMap(): Map<string, string> {
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
				// unreadable/ malformed package.json — skip
			}
		}
	}
	return map;
}

export function listJsonFiles(dir: string): string[] {
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
export function resolveBackendUrl(url: string, pkgMap: Map<string, string>) {
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
	return { repoDistFile, bytesFile };
}

export interface BackendResolveStats {
	entries: number;
	noMatch: number;
	noPkg: number;
	noJs: number;
	noMap: number;
	ok: number;
}

export function createBackendResolveStats(): BackendResolveStats {
	return { entries: 0, noMatch: 0, noPkg: 0, noJs: 0, noMap: 0, ok: 0 };
}

type V8Entry = Record<string, unknown> & { url: string };

/**
 * Resolve a parsed V8 coverage payload's entries to monocart-ingestible entries:
 * rewrite each backend `url` to its repo dist path (so coverageOptions.entryFilter
 * matches) and inline a source map whose `sources` point at the checkout `.ts`.
 * Non-backend / unresolvable entries are dropped (and counted in `stats`).
 */
export function resolveBackendEntries(
	parsed: { result?: V8Entry[] },
	pkgMap: Map<string, string>,
	stats: BackendResolveStats,
): V8Entry[] {
	return (parsed.result ?? [])
		.map((e): V8Entry | null => {
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
		.filter((e): e is V8Entry => e !== null);
}

export function formatBackendStats(stats: BackendResolveStats): string {
	return (
		`${stats.entries} seen → ${stats.ok} resolved ` +
		`(noPkg ${stats.noPkg}, noJs ${stats.noJs}, noMap ${stats.noMap}, other ${stats.noMatch})`
	);
}

// forceSpecTn is owned by @n8n/test-impact's map-build kernel; re-exported here
// so existing importers (and the test) keep their path.
export { forceSpecTn } from '@n8n/test-impact';
