import type { INodeExecutionData, IPairedItemData, ISourceData } from './interfaces';

export type PairedItemMemoResult =
	| { ok: true; result: INodeExecutionData }
	| { ok: false; error: unknown };

/** Identifies one paired item traversal state: an item of one node run output. */
export const pairedItemStateKey = (sourceData: ISourceData, pairedItem: IPairedItemData): string =>
	`${sourceData.previousNodeRun ?? 0}|${sourceData.previousNodeOutput ?? 0}|${pairedItem.item}|${sourceData.previousNode}`;

/**
 * Memoizes one paired item traversal per (node run output, item) state.
 * For a fixed destination, revisiting a state yields the same result or error.
 */
export class PairedItemMemo {
	private readonly entries = new Map<string, PairedItemMemoResult>();

	/** The memoized result for the state, or undefined when there is none. */
	get(key: string): PairedItemMemoResult | undefined {
		return this.entries.get(key);
	}

	/** Memoizes the result for the state. */
	set(key: string, result: PairedItemMemoResult): void {
		this.entries.set(key, result);
	}
}
