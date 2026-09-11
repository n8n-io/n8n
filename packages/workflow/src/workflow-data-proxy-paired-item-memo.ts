import type { INodeExecutionData, IPairedItemData, ISourceData } from './interfaces';

type PairedItemMemoResult =
	| { ok: true; result: INodeExecutionData }
	| { ok: false; error: unknown };

/**
 * Memoizes one paired item traversal per (node run output, item) state.
 * For a fixed destination, revisiting a state yields the same result or error.
 */
export class PairedItemMemo {
	private readonly entries = new Map<string, PairedItemMemoResult>();

	/**
	 * Resolves the memoized result for the given source data and paired item,
	 * or computes and memoizes a new result if none exists.
	 */
	resolve(
		sourceData: ISourceData,
		pairedItem: IPairedItemData,
		compute: () => INodeExecutionData,
	): INodeExecutionData {
		const key = this.toKey(sourceData, pairedItem);

		let entry = this.entries.get(key);
		if (!entry) {
			try {
				entry = { ok: true, result: compute() };
			} catch (error) {
				entry = { ok: false, error };
			}
			this.entries.set(key, entry);
		}

		if (entry.ok) return entry.result;
		throw entry.error;
	}

	private toKey(sourceData: ISourceData, pairedItem: IPairedItemData): string {
		return `${sourceData.previousNodeRun ?? 0}|${sourceData.previousNodeOutput ?? 0}|${pairedItem.item}|${sourceData.previousNode}`;
	}
}
