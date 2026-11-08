import type { ChangedFile, ImpactMap, ResolveResult } from '../impact-map.js';
import { resolveImpact } from '../impact-map.js';
import type { SelectionStrategy } from './strategy.js';

/**
 * Selection via the runtime V8 coverage map: a changed source file resolves to
 * the specs that executed it (function/line-level when `ChangedFile.lines` is
 * supplied, whole-file otherwise). Thin Strategy wrapper around the pure
 * {@link resolveImpact}; the fail-open-to-broad contract lives there.
 */
export class CoverageMapStrategy implements SelectionStrategy {
	readonly name = 'coverage-map';

	constructor(
		private readonly map: ImpactMap,
		private readonly opts: {
			allSpecs?: string[];
			siblingFallback?: boolean;
			onUncovered?: 'broad' | 'declare';
		} = {},
	) {}

	resolve(changed: ChangedFile[]): ResolveResult {
		return resolveImpact(changed, this.map, this.opts);
	}
}
