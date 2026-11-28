import type {
	INodeExecutionData,
	IPairedItemData,
	IRunExecutionData,
	ISourceData,
	ITaskData,
} from 'n8n-workflow';
import { pairedItemStateKey } from 'n8n-workflow';

/*
 * These functions do not cover all possible edge cases for backtracking through workflow run data.
 * They are designed to work for a simple and linear workflow execution.
 * If the workflow has branches or complex execution paths, additional logic may be needed.
 * We should follow up on this and improve the logic in the future.
 */

/*
 * If we cannot backtrack correctly, we return undefined to fallback to the current paired item behavior
 * failing in these functions will cause the parent workflow to fail
 */

/**
 * Returns the task data that produced the given input of a task.
 * Returns undefined when the input has no source or the source has no run data.
 */
export function previousTaskData(
	runData: IRunExecutionData['resultData']['runData'],
	currentRunData: ITaskData,
	inputIndex = 0,
): ITaskData | undefined {
	const nextNodeName = currentRunData.source?.[inputIndex]?.previousNode;
	if (!nextNodeName) {
		return undefined; // No next node
	}

	const nextRunData = runData[nextNodeName];
	if (!nextRunData || nextRunData.length === 0) {
		// We don't expect this case to happen in practice, but if for some reason it happens, we fallback to undefined
		return undefined; // No run data for the next node
	}

	const nextRunIndex = currentRunData.source?.[inputIndex]?.previousNodeRun ?? 0;

	return nextRunData[nextRunIndex]; // Return the first run data for the next node
}

/**
 * Returns the source of the item that a paired item of a task points to.
 * The source overwrite of the paired item replaces the source of the input.
 */
function sourceOfPairedItem(
	taskData: ITaskData,
	pairedItem: IPairedItemData,
): ISourceData | null | undefined {
	return pairedItem.sourceOverwrite ?? taskData.source[pairedItem.input ?? 0];
}

/** Returns the task data of a source. Returns undefined when the source has no run data. */
function taskDataOfSource(
	runData: IRunExecutionData['resultData']['runData'],
	source: ISourceData,
): ITaskData | undefined {
	return runData[source.previousNode]?.[source.previousNodeRun ?? 0];
}

/** A task without a source is the first task of the workflow run. */
function isFirstTask(taskData: ITaskData): boolean {
	return !taskData.source?.some((source) => source !== null);
}

/** The paired items of an item, as a list of objects. An item without paired item gives an empty list. */
function toPairedItems(pairedItem: INodeExecutionData['pairedItem']): IPairedItemData[] {
	if (pairedItem === undefined) {
		return [];
	}
	const pairedItems = Array.isArray(pairedItem) ? pairedItem : [pairedItem];
	return pairedItems.map((single) => (typeof single === 'number' ? { item: single } : single));
}

/** Collects paired items and keeps one for each input item. */
function createPairedItemCollection() {
	const byPosition = new Map<string, IPairedItemData>();

	return {
		add(pairedItem: IPairedItemData) {
			const position = `${pairedItem.input ?? 0}|${pairedItem.item}`;
			if (!byPosition.has(position)) {
				byPosition.set(position, pairedItem);
			}
		},
		/** One paired item, a list when there are several, undefined when there is none. */
		toPairedItem(): IPairedItemData | IPairedItemData[] | undefined {
			const pairedItems = [...byPosition.values()];
			return pairedItems.length > 1 ? pairedItems : pairedItems[0];
		},
	};
}

/**
 * Returns the paired items of the given item of the last executed node, as they
 * were in the first task of the workflow run. Follows each paired item of each
 * item on the way, so an item that comes from several items keeps all of them.
 * Returns undefined when one of the paths does not reach the first task.
 */
export function findPairedItemThroughWorkflowData(
	workflowRunData: IRunExecutionData,
	item: INodeExecutionData,
): IPairedItemData | IPairedItemData[] | undefined {
	const { runData, lastNodeExecuted } = workflowRunData.resultData;
	if (!lastNodeExecuted) {
		// If no node name is available, then we don't know where to start backtracking
		return undefined;
	}

	// Since we are backtracking through the workflow, we start with the last run data
	const lastTaskData = runData[lastNodeExecuted]?.at(-1);
	if (!lastTaskData) {
		// If no run data is available, then the workflow did not run at all
		return undefined;
	}

	const firstPairedItems = createPairedItemCollection();
	const visitedItems = new Set<string>();
	// Each entry is the paired item data of one item, with the task that produced the item.
	const toFollow = [{ taskData: lastTaskData, pairedItem: item.pairedItem }];

	for (let current = toFollow.pop(); current !== undefined; current = toFollow.pop()) {
		const { taskData } = current;
		const pairedItems = toPairedItems(current.pairedItem);
		if (pairedItems.length === 0) {
			return undefined;
		}

		if (isFirstTask(taskData)) {
			pairedItems.forEach((pairedItem) => firstPairedItems.add(pairedItem));
			continue;
		}

		// Each paired item points to an input of the current task.
		// We follow the source of that input until we reach the first task of the workflow run.
		const sourceItems: typeof toFollow = [];
		for (const pairedItem of pairedItems) {
			const source = sourceOfPairedItem(taskData, pairedItem);
			const sourceTaskData = source ? taskDataOfSource(runData, source) : undefined;
			if (!source || sourceTaskData === undefined) {
				return undefined;
			}

			const sourceItemKey = pairedItemStateKey(source, pairedItem);
			if (!visitedItems.has(sourceItemKey)) {
				visitedItems.add(sourceItemKey);
				const outputIndex = source.previousNodeOutput ?? 0;
				sourceItems.push({
					taskData: sourceTaskData,
					pairedItem: sourceTaskData.data?.main?.[outputIndex]?.[pairedItem.item]?.pairedItem,
				});
			}
		}
		// The last entry is followed first. The reverse order keeps the order of the paired items.
		toFollow.push(...sourceItems.reverse());
	}

	return firstPairedItems.toPairedItem();
}
