/**
 * `@n8n/test-impact` — framework-agnostic Test Impact Analysis core.
 *
 * Phase 1 (ts-morph-free): coverage-map (build + resolve), orchestrator
 * (shard bin-packing), and the V8 selection path. AST-based selection and
 * the Playwright fixture subpath land in later phases.
 */
export * from './impact-map.js';
export * from './shard-distributor.js';
export * from './select.js';
export * from './map-build.js';
export {
	isNonImpactful,
	filterImpactfulChanges,
	forcesBroad,
	classifyManifestChange,
	dropDevDepOnlyDeps,
	changedRuntimeDeps,
	changedRuntimeDepsFromManifests,
	stripDependencyFiles,
	RUNTIME_SECTIONS,
	type ManifestChangeKind,
} from './changes.js';
export { dependentDirs, type WorkspaceImporters } from './dep-graph.js';
export type { DiscoveredSpec } from './types.js';

// Strategy + Pipeline selection layer.
export type { SelectionStrategy } from './select/strategy.js';
export { CoverageMapStrategy } from './select/coverage-map-strategy.js';
export { DependencyGraphStrategy } from './select/dep-graph-strategy.js';
export { selectImpactedTests } from './select/pipeline.js';
