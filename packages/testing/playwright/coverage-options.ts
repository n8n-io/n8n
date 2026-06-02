import type { CoverageReportOptions } from 'monocart-coverage-reports';

/**
 * Frontend E2E coverage via browser-native V8 (Playwright `page.coverage`),
 * converted to lcov/html by monocart-coverage-reports. Replaces the previous
 * istanbul build-time instrumentation (`vite-plugin-istanbul`) — no special
 * build is needed, V8 collects from the normal bundle at runtime.
 *
 * Gated on COVERAGE_ENABLED so normal test runs pay no collection cost.
 */
export const COVERAGE_ENABLED = process.env.COVERAGE_ENABLED === 'true';

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
	// `credentials/` etc — not `src/` — so don't require `/src/`.
	sourceFilter: (sourcePath) =>
		!sourcePath.includes('node_modules') && !sourcePath.includes('/dist/'),
	// Normalise to repo-relative so Codecov + the impact map key on
	// `packages/.../src/...`. Both frontend and backend map-sources arrive as
	// relative `src/...`, so the owning package is taken from info.distFile:
	// backend dist files are repo `packages/<x>/dist/...`; the frontend bundle
	// is not, so it falls through to editor-ui.
	// `filePath` is the source path MCR unpacks from the source map, relative to
	// the workspace `packages/` base (e.g. `cli/src/...`, `@n8n/db/src/...`,
	// `frontend/editor-ui/src/...`) because we rewrite backend map sources to
	// absolute repo paths and the frontend bundle resolves under the same root.
	// Re-prefix to repo-relative so frontend + backend land in one keyed report.
	sourcePath: (filePath) => {
		const norm = filePath.replace(/\\/g, '/');
		if (norm.startsWith('packages/')) return norm;
		const i = norm.lastIndexOf('packages/');
		if (i >= 0) return norm.slice(i);
		// Backend map sources resolve to absolute → package-qualified here
		// (`cli/src/...`, `nodes-base/nodes/...`, `@n8n/db/src/...`). The frontend
		// bundle resolves relative, so its sources arrive as `src/...` with no
		// package — attribute those to editor-ui.
		return norm.startsWith('src/') ? `packages/frontend/editor-ui/${norm}` : `packages/${norm}`;
	},
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
