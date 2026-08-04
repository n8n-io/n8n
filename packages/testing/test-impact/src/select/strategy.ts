import type { ChangedFile, ResolveResult } from '../impact-map.js';

/**
 * A selection strategy: given changed files, decide which specs must run.
 *
 * Each strategy resolves *independently* and may return `mode: 'broad'` to mean
 * "I can't scope this — run everything." The {@link selectImpactedTests} pipeline
 * unions scoped results and lets broad win (fail-open). Implementations:
 * `CoverageMapStrategy` (runtime coverage), and — later — an AST selector for
 * test-internal changes and a dep-graph selector for dependency changes.
 */
export interface SelectionStrategy {
	/** Stable id for logging / telemetry (e.g. 'coverage-map', 'ast', 'dep-graph'). */
	readonly name: string;
	resolve(changed: ChangedFile[]): ResolveResult;
}
