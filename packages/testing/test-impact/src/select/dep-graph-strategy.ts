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
		// Any changed dep that no workspace package declares (purely transitive)
		// can't be attributed → broad. A MIXED change must go broad too: scoping to
		// just the attributable deps would silently drop the unattributable ones.
		// `unmapped` carries the dep NAMES here (not file paths) purely for the
		// broad-reason diagnostic; broad mode runs everything regardless.
		const declared = new Set(Object.values(this.importers).flat());
		const unattributable = this.changedDeps.filter((dep) => !declared.has(dep));
		if (unattributable.length > 0) {
			return {
				specs: this.opts.allSpecs ?? [],
				unmapped: unattributable,
				mode: 'broad',
			};
		}
		// Every changed dep is declared by at least one importer, so the walk
		// always resolves to at least those dirs.
		const dirs = dependentDirs(this.changedDeps, this.importers);
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
