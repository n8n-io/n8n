import type { INodeExecutionData, IPairedItemData, ISourceData } from './interfaces';

type PairedItemMemoResult =
	| { ok: true; result: INodeExecutionData }
	| { ok: false; error: unknown };

/**
 * Memoizes one paired item traversal per (node run output, item) state, and
 * detects lineage cycles in the same pass.
 *
 * A state that is already in flight higher up the stack cannot be resolved
 * again: the walk would repeat itself, so `onCycle` supplies the error to
 * throw. A result computed while such a state was in flight depends on where
 * the walk started, so it is not memoized.
 */
export class PairedItemMemo {
	private readonly entries = new Map<string, PairedItemMemoResult>();

	private readonly inFlight = new Set<string>();

	private cyclesSeen = 0;

	/**
	 * Resolves the memoized result for the given source data and paired item,
	 * or computes and memoizes a new result if none exists.
	 */
	resolve(
		sourceData: ISourceData,
		pairedItem: IPairedItemData,
		compute: () => INodeExecutionData,
		onCycle: () => Error,
	): INodeExecutionData {
		const key = this.toKey(sourceData, pairedItem);

		const entry = this.entries.get(key);
		if (entry) {
			if (entry.ok) return entry.result;
			throw entry.error;
		}

		if (this.inFlight.has(key)) {
			this.cyclesSeen++;
			throw onCycle();
		}

		const cyclesBefore = this.cyclesSeen;
		this.inFlight.add(key);

		let computed: PairedItemMemoResult;
		try {
			computed = { ok: true, result: compute() };
		} catch (error) {
			computed = { ok: false, error };
		} finally {
			this.inFlight.delete(key);
		}

		if (this.cyclesSeen === cyclesBefore) {
			this.entries.set(key, computed);
		}

		if (computed.ok) return computed.result;
		throw computed.error;
	}

	private toKey(sourceData: ISourceData, pairedItem: IPairedItemData): string {
		return `${sourceData.previousNodeRun ?? 0}|${sourceData.previousNodeOutput ?? 0}|${pairedItem.item}|${sourceData.previousNode}`;
	}
}
