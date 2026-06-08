import { dependentDirs, type WorkspaceImporters } from '../dep-graph.js';
import type { ImpactMap, ResolveResult } from '../impact-map.js';
import { resolveImpact } from '../impact-map.js';
import type { SelectionStrategy } from './strategy.js';

/**
 * Runtime-dependency selection: walk each changed dep to the packages
 * that declare it, then resolve those package dirs through the map. A dep no
 * workspace package declares (purely transitive) → broad (can't attribute).
 * Resolves the precomputed `changedDeps`; the `changed` arg is unused.
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
			// `unmapped` carries the dep NAMES here (not file paths) purely for the
			// broad-reason diagnostic; broad mode runs everything regardless.
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
