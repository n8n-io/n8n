import type { ParityCase } from '../grammar/ir';
import type { Diff } from './compare';

/**
 * An intended gap between the engines. The oracle ignores a difference that
 * matches an entry. Remove the entry in the PR that closes the gap.
 */
export interface KnownDivergence {
	id: string;
	/** The Linear ticket of the gap. */
	linear: string;
	description: string;
	matches(diff: Diff, parityCase: ParityCase): boolean;
}

export const knownDivergences: KnownDivergence[] = [];

/** The ID of the first known divergence that matches the difference. */
export function matchKnownDivergence(
	diff: Diff,
	parityCase: ParityCase,
	registry: KnownDivergence[] = knownDivergences,
): string | undefined {
	return registry.find((entry) => entry.matches(diff, parityCase))?.id;
}
