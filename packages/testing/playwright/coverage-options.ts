import type { TestInfo } from '@playwright/test';
import type { CoverageReportOptions } from 'monocart-coverage-reports';
import { relative } from 'node:path';

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
	// Key Codecov + the impact map on repo-relative `packages/.../src/...`.
	// Backend map-sources resolve to absolute repo paths (package-qualified);
	// the frontend bundle resolves relative, so its `src/...` sources have no
	// package and are attributed to editor-ui.
	sourcePath: (filePath) => {
		const norm = filePath.replace(/\\/g, '/');
		if (norm.startsWith('packages/')) return norm;
		const i = norm.lastIndexOf('packages/');
		if (i >= 0) return norm.slice(i);
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
