import { dependentDirs, type WorkspaceImporters } from '../dep-graph.js';
import type { ImpactMap, ResolveResult } from '../impact-map.js';
import { resolveImpact } from '../impact-map.js';
import type { SelectionStrategy } from './strategy.js';

/**
 * Selection for runtime dependency changes (DEVP-389): each changed runtime dep
 * is walked to the workspace packages that declare it, then those package dirs
 * are resolved through the coverage map (via sibling fallback) to the specs that
 * exercise them.
 *
 * Fail-open: if a changed dep is declared by no workspace package (a purely
 * transitive bump we can't attribute), it returns `mode: 'broad'` so the
 * pipeline runs everything. Resolves the precomputed `changedDeps` — the
 * `changed` files argument is unused (the deps already came from the manifest
 * diffs the caller classified).
 */
export class DependencyGraphStrategy implements SelectionStrategy {
	readonly name = 'dep-graph';

	constructor(
		private readonly map: ImpactMap,
		private readonly importers: WorkspaceImporters,
		private readonly changedDeps: string[],
		private readonly opts: { allSpecs?: string[] } = {},
	) {}

	resolve(): ResolveResult {
		if (this.changedDeps.length === 0) {
			return { specs: [], unmapped: [], mode: 'scoped' };
		}
		const dirs = dependentDirs(this.changedDeps, this.importers);
		if (dirs.length === 0) {
			// No workspace package declares the changed dep → can't attribute → broad.
			return {
				specs: this.opts.allSpecs ?? [],
				unmapped: this.changedDeps,
				mode: 'broad',
			};
		}
		// Resolve each dependent package dir through the map. A package.json path
		// has no own map entry, so sibling fallback scopes it to the specs covering
		// that package's files.
		const synthetic = dirs.map((dir) => ({
			file: dir === '.' ? 'package.json' : `${dir}/package.json`,
		}));
		return resolveImpact(synthetic, this.map, {
			allSpecs: this.opts.allSpecs,
			siblingFallback: true,
		});
	}
}
