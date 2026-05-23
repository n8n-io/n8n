import type { N8NStartupDiagnostics } from './services/n8n';

/**
 * Worker-local stash for the most recent n8n startup failure.
 *
 * Why a module-global instead of returning it on the failure path: the
 * playwright `n8nContainer` worker fixture re-throws when `createN8NStack`
 * fails, so dependent test fixtures only see `n8nContainer === undefined`.
 * The observability fixture then has no way to reach the captured logs and
 * readiness payload through the normal fixture graph. Stashing the data
 * here lets it cross that gap without restructuring fixture wiring.
 *
 * Playwright workers run in separate processes, so this module-global is
 * scoped to a single worker — concurrent workers do not clobber each other.
 */
let latestStartupFailure: {
	projectName: string;
	diagnostics: N8NStartupDiagnostics;
	message: string;
} | null = null;

export function recordStartupFailure(
	projectName: string,
	diagnostics: N8NStartupDiagnostics,
	message: string,
): void {
	latestStartupFailure = { projectName, diagnostics, message };
}

export function consumeStartupFailure(): {
	projectName: string;
	diagnostics: N8NStartupDiagnostics;
	message: string;
} | null {
	const failure = latestStartupFailure;
	latestStartupFailure = null;
	return failure;
}
