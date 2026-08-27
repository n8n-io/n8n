import type { TestInfo } from '@playwright/test';
import type { CoverageReport, CoverageReportOptions } from 'monocart-coverage-reports';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

/**
 * Frontend E2E coverage via browser-native V8 (Playwright `page.coverage`),
 * converted to lcov/html by monocart-coverage-reports. Replaces the previous
 * istanbul build-time instrumentation (`vite-plugin-istanbul`) — no special
 * build is needed, V8 collects from the normal bundle at runtime.
 *
 * Gated on COVERAGE_ENABLED so normal test runs pay no collection cost.
 */
export const COVERAGE_ENABLED = process.env.COVERAGE_ENABLED === 'true';

function packageNameOf(specifier: string): string {
	const segs = specifier.split('/');
	return specifier.startsWith('@') ? segs.slice(0, 2).join('/') : segs[0];
}

function findRepoRoot(): string {
	let dir = process.cwd();
	while (!existsSync(join(dir, 'pnpm-workspace.yaml'))) {
		const parent = dirname(dir);
		if (parent === dir) throw new Error(`no pnpm-workspace.yaml above ${process.cwd()}`);
		dir = parent;
	}
	return dir;
}

export interface WorkspaceIndex {
	/** e.g. `@n8n/design-system` → `packages/frontend/@n8n/design-system`. */
	names: ReadonlyMap<string, string>;
	/** Every dir under `packages/` — tells a dir-relative path from a package specifier. */
	dirs: ReadonlySet<string>;
}

export function buildWorkspaceIndex(repoRoot: string): WorkspaceIndex {
	const names = new Map<string, string>();
	const dirs = new Set<string>();
	const walk = (absDir: string, relDir: string) => {
		dirs.add(relDir);
		for (const entry of readdirSync(absDir, { withFileTypes: true })) {
			if (!entry.isDirectory() || entry.name === 'node_modules') continue;
			const abs = join(absDir, entry.name);
			const rel = `${relDir}/${entry.name}`;
			const manifest = join(abs, 'package.json');
			if (existsSync(manifest)) {
				const { name } = JSON.parse(readFileSync(manifest, 'utf8')) as { name?: string };
				if (name) names.set(name, rel);
			}
			walk(abs, rel); // packages nest (packages/frontend/@n8n/*)
		}
	};
	walk(join(repoRoot, 'packages'), 'packages');
	return { names, dirs };
}

const EMPTY_INDEX: WorkspaceIndex = { names: new Map(), dirs: new Set() };
let workspaceIndexCache: WorkspaceIndex | undefined;

function workspaceIndex(): WorkspaceIndex {
	if (!workspaceIndexCache) {
		try {
			workspaceIndexCache = buildWorkspaceIndex(findRepoRoot());
		} catch (error) {
			console.warn(`⚠ coverage: workspace index unavailable (${(error as Error).message})`);
			workspaceIndexCache = EMPTY_INDEX;
		}
	}
	return workspaceIndexCache;
}

/** Normalise a post-source-map path to the repo-relative form Codecov and the
 * impact map key on. Index passed in to keep this pure. */
export function resolveSourcePath(filePath: string, index: WorkspaceIndex): string {
	const norm = filePath.replace(/\\/g, '/');
	if (norm.startsWith('packages/')) return norm;
	const i = norm.lastIndexOf('packages/');
	if (i >= 0) return norm.slice(i);
	if (norm.startsWith('src/')) return `packages/frontend/editor-ui/${norm}`;
	// Chunks with no source map arrive URL-derived; sourceFilter never sees them
	// (no sources to filter), so keep them out of the packages/ namespace here.
	if (/^localhost[-:]\d+\//.test(norm)) return norm;
	// Backend sources are dir-relative (`cli/src/x.ts`); the frontend bundle is a
	// package specifier whose dir sits under packages/frontend/, so `packages/` +
	// name would mislabel it and its changes would match nothing in the map.
	const asDir = `packages/${norm}`;
	if (index.dirs.has(asDir.slice(0, asDir.lastIndexOf('/')))) return asDir;
	const name = packageNameOf(norm);
	const dir = index.names.get(name);
	return dir ? `${dir}${norm.slice(name.length)}` : asDir;
}

/**
 * Shared by the per-test collector (`add`) and the report generator
 * (`generate`) so both read/write the same outputDir + raw cache.
 */
export const coverageOptions: CoverageReportOptions = {
	name: 'n8n E2E Coverage (V8)',
	outputDir: './coverage',
	// 'v8' = interactive HTML; 'lcovonly' = lcov.info for Codecov; summary to stdout.
	reports: ['v8', 'lcovonly', 'console-summary'],
	// Frontend: keep app bundles served by n8n. Backend: keep n8n's own
	// packages (the collect step rewrites their urls to repo dist paths).
	entryFilter: (entry) =>
		entry.url.includes('/assets/') || /\/packages\/[^/]+(?:\/[^/]+)?\/dist\//.test(entry.url),
	// Keep first-party application source after source-map expansion; drop deps
	// and any unmapped dist files. NB nodes-base sources live under `nodes/`,
	// `credentials/` etc — not `src/` — so don't require `/src/`. The test/mock
	// exclusions mirror the per-package vitest coverage excludes — keep them in sync.
	sourceFilter: (sourcePath) =>
		!sourcePath.includes('node_modules') &&
		!sourcePath.includes('/dist/') &&
		!sourcePath.endsWith('.d.ts') &&
		!sourcePath.endsWith('.spec.ts') &&
		!sourcePath.endsWith('.test.ts') &&
		!sourcePath.includes('/__tests__/') &&
		!sourcePath.includes('/__mocks__/'),
	sourcePath: (filePath) => resolveSourcePath(filePath, workspaceIndex()),
};

/**
 * Directory for per-test (per-spec) raw coverage, used to build the impact map.
 *
 * It MUST be a sibling of `outputDir`, never inside it: the shard report's
 * `CoverageReport.generate()` cleans its own `outputDir` (deleting every child
 * except `.cache`/the V8 dir), so per-spec raw kept under `outputDir` is wiped
 * before the emitter reads it. Single source of truth for the fixture (writes),
 * the emitter (reads), and the drift guard test. See coverage-pipeline.test.ts.
 */
export function bySpecDir(outputDir: string = coverageOptions.outputDir ?? './coverage'): string {
	return `${outputDir.replace(/\/+$/, '')}-by-spec`;
}

export const BY_SPEC_DIR = bySpecDir();

/**
 * Per-spec BACKEND raw coverage (DEVP-370), written by the backend coverage
 * fixture and read by emit-spec-backend-lcovs. Separate from BY_SPEC_DIR so the
 * frontend (browser `page.coverage`) and backend (n8n server V8 via the e2e
 * coverage hook) raws never collide. Like BY_SPEC_DIR it MUST be a sibling of
 * `outputDir`, never inside it (the shard report's generate() cleans outputDir).
 */
export function backendBySpecDir(
	outputDir: string = coverageOptions.outputDir ?? './coverage',
): string {
	return `${outputDir.replace(/\/+$/, '')}-by-spec-backend`;
}

export const BACKEND_BY_SPEC_DIR = backendBySpecDir();

/** Spec id = project-relative path — the id the runner and impact map key on.
 *  Shared by the frontend and backend per-spec coverage fixtures. */
export function specId(testInfo: TestInfo): string {
	return relative(process.cwd(), testInfo.file).split('\\').join('/');
}

/** Filesystem-safe slug for a spec id (per-spec coverage directory name). */
export const slugify = (spec: string): string => spec.replace(/[^a-zA-Z0-9]+/g, '_');

/**
 * Feed a V8 coverage list into a report in byte-bounded batches. MCR's `add()`
 * JSON.stringify's each call's data into a single cache file, so one
 * navigation-heavy page's list (duplicate bundle sources across navigations)
 * can exceed V8's ~512MB string cap. Splitting by cumulative source bytes keeps
 * every stringify well under it; MCR unions the cache files at `generate()`.
 * Accepts a sync or async iterable so callers can stream entries off disk.
 */
export async function addV8CoverageInBatches(
	report: CoverageReport,
	entries: Iterable<unknown> | AsyncIterable<unknown>,
	maxBytes = 200_000_000,
): Promise<void> {
	let batch: unknown[] = [];
	let bytes = 0;
	for await (const entry of entries) {
		batch.push(entry);
		bytes += (entry as { source?: string }).source?.length ?? 0;
		if (bytes >= maxBytes) {
			await report.add(batch as never);
			batch = [];
			bytes = 0;
		}
	}
	if (batch.length) await report.add(batch as never);
}

interface V8Range {
	startOffset: number;
	endOffset: number;
	count: number;
}
interface V8Function {
	functionName: string;
	isBlockCoverage: boolean;
	ranges: V8Range[];
}
export interface V8CoverageEntry {
	url: string;
	scriptId?: string;
	source?: string;
	functions: V8Function[];
}

/** Sum `source`'s function-range counts into `target` (same script, re-executed). */
function mergeFunctionCounts(target: V8Function[], source: V8Function[]): void {
	const fnKey = (f: V8Function) => `${f.functionName}@${f.ranges[0]?.startOffset ?? 0}`;
	const fnMap = new Map(target.map((f) => [fnKey(f), f]));
	for (const sf of source) {
		const tf = fnMap.get(fnKey(sf));
		if (!tf) {
			target.push(sf);
			fnMap.set(fnKey(sf), sf);
			continue;
		}
		const rKey = (r: V8Range) => `${r.startOffset}:${r.endOffset}`;
		const rMap = new Map(tf.ranges.map((r) => [rKey(r), r]));
		for (const sr of sf.ranges) {
			const tr = rMap.get(rKey(sr));
			if (tr) tr.count += sr.count;
			else {
				tf.ranges.push(sr);
				rMap.set(rKey(sr), sr);
			}
		}
	}
}

/**
 * Collapse V8 coverage entries that share a URL into one. With
 * resetOnNavigation:false the same bundle is re-loaded under a fresh scriptId on
 * every navigation, so a navigation-heavy test ends up holding N full copies of
 * each script's source — enough to OOM the worker heap or blow V8's ~512MB
 * string cap. Keep one source per URL and sum execution counts per range — the
 * same union MCR computes at generate(), done early so the raw never bloats.
 */
export function mergeV8CoverageByUrl(entries: V8CoverageEntry[]): V8CoverageEntry[] {
	const byUrl = new Map<string, V8CoverageEntry>();
	for (const entry of entries) {
		const existing = byUrl.get(entry.url);
		if (existing) mergeFunctionCounts(existing.functions, entry.functions);
		else byUrl.set(entry.url, entry);
	}
	return [...byUrl.values()];
}
