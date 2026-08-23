import type { N8NStartupDiagnostics } from './services/n8n';

// Module-global because the playwright `n8nContainer` worker fixture re-throws
// when `createN8NStack` fails, so dependent fixtures only see `n8nContainer ===
// undefined` and have no fixture-graph path to the captured diagnostics. Scoped
// per worker — playwright workers are separate processes.
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
