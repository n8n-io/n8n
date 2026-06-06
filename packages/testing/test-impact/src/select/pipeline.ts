import type { ChangedFile, ResolveResult } from '../impact-map.js';
import type { SelectionStrategy } from './strategy.js';

/**
 * Run every selector over the changed files and combine, biased to OVER-select:
 *
 * - if ANY selector returns `mode: 'broad'`, the whole result is broad (broad
 *   wins — never skip a test on uncertainty);
 * - otherwise union the scoped spec sets.
 *
 * This is the single place the fail-open contract lives — it formalises the
 * `V8 ∪ AST` union that `distribute-tests` previously did inline, so adding a
 * dep-graph or AST selector needs no change here.
 */
export function selectImpactedTests(
	changed: ChangedFile[],
	selectors: SelectionStrategy[],
): ResolveResult {
	const specs = new Set<string>();
	const unmapped = new Set<string>();
	const viaSibling = new Set<string>();

	for (const selector of selectors) {
		const result = selector.resolve(changed);
		if (result.mode === 'broad') return result; // broad wins, short-circuit
		for (const spec of result.specs) specs.add(spec);
		for (const file of result.unmapped) unmapped.add(file);
		for (const file of result.viaSibling ?? []) viaSibling.add(file);
	}

	return {
		specs: [...specs].sort(),
		unmapped: [...unmapped],
		mode: 'scoped',
		...(viaSibling.size ? { viaSibling: [...viaSibling] } : {}),
	};
}
