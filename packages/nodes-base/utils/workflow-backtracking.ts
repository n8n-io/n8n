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
 * This function retrieves the previous task data for a given task in the workflow run data.
 * Until there is no more source set
 */
export function previousTaskData(
	runData: IRunExecutionData['resultData']['runData'],
	currentRunData: ITaskData,
): ITaskData | undefined {
	const nextNodeName = currentRunData.source?.[0]?.previousNode;
	if (!nextNodeName) {
		return undefined; // No next node
	}

	const nextRunData = runData[nextNodeName];
	if (!nextRunData || nextRunData.length === 0) {
		// We don't expect this case to happen in practice, but if for some reason it happens, we fallback to undefined
		return undefined; // No run data for the next node
	}

	const nextRunIndex = currentRunData.source?.[0]?.previousNodeRun ?? 0;

	return nextRunData[nextRunIndex]; // Return the first run data for the next node
}

export function findPairedItemTroughWorkflowData(
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

	// Now we are getting the second last task data, because our initial pairedItem points to this.
	let runDataItem = previousTaskData(workflowRunData.resultData.runData, taskData);

	let pairedItem = item.pairedItem;

	// move the runDataItem to the previous node in the in the workflow execution data
	// and find the paired item of the current item in the previous task data
	// We do this until we reach the first task data of the workflow run

	while (runDataItem !== undefined) {
		// We find the output items for the current run data item
		const nodeInformationArray = runDataItem.data?.['main'];

		// We find and fallback to 0 for the input index and item index
		// The input index is the run the node was executed in case it was executed multiple times
		// The item index is the index of the paired item we are looking for
		let inputIndex = 0;
		let nodeIndex = itemIndex;
		if (typeof pairedItem === 'object') {
			inputIndex = (pairedItem as IPairedItemData).input ?? 0;
			nodeIndex = (pairedItem as IPairedItemData).item ?? itemIndex;
		} else if (typeof pairedItem === 'number') {
			// If the paired item is a number, we use it as the node index
			nodeIndex = pairedItem;
			// and fallback to 0 for the input index
			inputIndex = 0;
		}

		// We found the paired item of the current run data item, this points to the node in the previous task data
		pairedItem = nodeInformationArray?.[inputIndex]?.[nodeIndex]?.pairedItem;

		// We move the runDataItem to the previous task data
		runDataItem = previousTaskData(workflowRunData.resultData.runData, runDataItem);
	}

	// This is the paired item that was in the first task data when the workflow was executed
	return pairedItem;
}
