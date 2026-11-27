import type {
	INodeExecutionData,
	IPairedItemData,
	IRunExecutionData,
	ITaskData,
} from 'n8n-workflow';

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

/** A task without a source is the first task of the workflow run. */
function isFirstTask(taskData: ITaskData): boolean {
	return !taskData.source?.some((source) => source !== null);
}

/** A missing input index means input 0. A missing item index means the given item index. */
function toPairedItemPosition(
	pairedItem: INodeExecutionData['pairedItem'],
	itemIndex: number,
): { input: number; item: number } {
	const single = typeof pairedItem === 'number' ? { item: pairedItem } : pairedItem;
	if (single !== undefined && !Array.isArray(single)) {
		return { input: single.input ?? 0, item: single.item ?? itemIndex };
	}
	return { input: 0, item: itemIndex };
}

export function findPairedItemThroughWorkflowData(
	workflowRunData: IRunExecutionData,
	item: INodeExecutionData,
	itemIndex: number,
): IPairedItemData | IPairedItemData[] | number | undefined {
	// The provided item is already the item of the last node executed in this workflow run
	// So the item.pairedItem is the paired item of the last node executed and is therefore referencing
	// a node in the previous task data

	const currentNodeName = workflowRunData.resultData.lastNodeExecuted;
	if (!currentNodeName) {
		// If no node name is available, then we don't know where to start backtracking
		return undefined;
	}

	// This is the run data of the last node executed in the workflow run
	const runData = workflowRunData.resultData.runData[currentNodeName];

	if (!runData) {
		// No run data available for the last node executed
		return undefined;
	}

	// Since we are backtracking through the workflow, we start with the last run data
	const runIndex = runData.length - 1;

	const taskData = runData[runIndex];

	if (!taskData) {
		// If no run data is available, then the workflow did not run at all
		return undefined;
	}

	let currentTaskData = taskData;
	let pairedItem = item.pairedItem;

	// Each paired item points to an input of the current task.
	// We follow the source of that input until we reach the first task of the workflow run.
	while (!isFirstTask(currentTaskData)) {
		const { input, item: sourceItemIndex } = toPairedItemPosition(pairedItem, itemIndex);
		const sourceTaskData = previousTaskData(
			workflowRunData.resultData.runData,
			currentTaskData,
			input,
		);
		if (sourceTaskData === undefined) {
			return undefined;
		}

		const outputIndex = currentTaskData.source[input]?.previousNodeOutput ?? 0;
		pairedItem = sourceTaskData.data?.main?.[outputIndex]?.[sourceItemIndex]?.pairedItem;
		currentTaskData = sourceTaskData;
	}

	// This is the paired item that was in the first task data when the workflow was executed
	return pairedItem;
}
