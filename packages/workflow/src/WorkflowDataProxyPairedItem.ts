import type { IPairedItemData, ISourceData, ITaskData, IRunExecutionData } from './Interfaces';
import type { INodeExecutionData, Workflow, WorkflowExecuteMode } from '.';
import { getPinDataIfManualExecution, createErrorUtils } from './WorkflowDataProxyHelpers';

export const PAIRED_ITEM_METHOD = {
	PAIRED_ITEM: 'pairedItem',
	ITEM_MATCHING: 'itemMatching',
	ITEM: 'item',
	$GET_PAIRED_ITEM: '$getPairedItem',
} as const;

export type PairedItemMethod = (typeof PAIRED_ITEM_METHOD)[keyof typeof PAIRED_ITEM_METHOD];

export function normalizeInputs(
	pairedItem: IPairedItemData,
	sourceData: ISourceData | null,
): [IPairedItemData, ISourceData | null] {
	if (typeof pairedItem === 'number') {
		pairedItem = { item: pairedItem };
	}
	const finalSource = pairedItem.sourceOverwrite ?? sourceData;
	return [pairedItem, finalSource];
}

export function pinDataToTask(pinData: INodeExecutionData[] | undefined): ITaskData | undefined {
	if (!pinData) return undefined;
	return {
		data: { main: [pinData] },
		startTime: 0,
		executionTime: 0,
		executionIndex: 0,
		source: [],
	};
}

export interface DataProxyContext {
	readonly workflow: Workflow;
	readonly mode: WorkflowExecuteMode;
	readonly runIndex: number;
	readonly itemIndex: number;
	readonly activeNodeName: string;
	readonly runExecutionData: IRunExecutionData | null;
}

export const usePairedItem = (context: DataProxyContext) => {
	const { workflow, mode, runExecutionData } = context;

	const errorUtils = createErrorUtils(context);

	function getTaskData(source: ISourceData): ITaskData | undefined {
		return (
			runExecutionData?.resultData?.runData?.[source.previousNode]?.[source.previousNodeRun || 0] ??
			pinDataToTask(getPinDataIfManualExecution(workflow, source.previousNode, mode))
		);
	}

	function getNodeOutput(
		taskData: ITaskData | undefined,
		source: ISourceData,
		nodeCause?: string,
	): INodeExecutionData[] {
		const outputIndex = source.previousNodeOutput || 0;
		const outputs = taskData?.data?.main?.[outputIndex];
		if (!outputs) {
			throw errorUtils.createExpressionError('Can’t get data for expression', {
				messageTemplate: 'Missing output data',
				functionOverrides: { message: 'Missing output' },
				nodeCause,
				description: `Expected output #${outputIndex} from node ${source.previousNode}`,
				type: 'internal',
			});
		}
		return outputs;
	}

	const pairingResolver = {
		getPairedItem: (
			destinationNodeName: string,
			incomingSourceData: ISourceData | null,
			initialPairedItem: IPairedItemData,
			usedMethodName: PairedItemMethod = PAIRED_ITEM_METHOD.$GET_PAIRED_ITEM,
		): INodeExecutionData | null => {
			// Step 1: Normalize inputs
			const [pairedItem, sourceData] = normalizeInputs(initialPairedItem, incomingSourceData);

			let currentPairedItem = pairedItem;
			let currentSource = sourceData;
			let nodeBeforeLast: string | undefined;

			// Step 2: Traverse ancestry to find correct node
			while (currentSource && currentSource.previousNode !== destinationNodeName) {
				const taskData = getTaskData(currentSource);
				const outputData = getNodeOutput(taskData, currentSource, nodeBeforeLast);
				const sourceArray = taskData?.source.filter((s): s is ISourceData => s !== null) ?? [];

				const item = outputData[currentPairedItem.item];
				if (item?.pairedItem === undefined) {
					throw errorUtils.createMissingPairedItemError(currentSource.previousNode, usedMethodName);
				}

				// Multiple pairings? Recurse over all
				if (Array.isArray(item.pairedItem)) {
					return pairingResolver.resolveMultiplePairings(
						item.pairedItem,
						sourceArray,
						destinationNodeName,
						usedMethodName,
						currentPairedItem.item,
					);
				}

				// Follow single paired item
				currentPairedItem =
					typeof item.pairedItem === 'number' ? { item: item.pairedItem } : item.pairedItem;

				const inputIndex = currentPairedItem.input || 0;

				if (inputIndex >= sourceArray.length) {
					if (sourceArray.length === 0) {
						throw errorUtils.createNoConnectionError(destinationNodeName);
					}

					throw errorUtils.createBranchNotFoundError(
						currentSource.previousNode,
						currentPairedItem.item,
						nodeBeforeLast,
					);
				}

				nodeBeforeLast = currentSource.previousNode;
				currentSource = currentPairedItem.sourceOverwrite || sourceArray[inputIndex];
			}

			// Step 3: Final node reached — fetch paired item
			if (!currentSource)
				throw errorUtils.createPairedItemNotFound(destinationNodeName, nodeBeforeLast);

			const finalTaskData = getTaskData(currentSource);
			const finalOutputData = getNodeOutput(finalTaskData, currentSource);

			if (currentPairedItem.item >= finalOutputData.length) {
				throw errorUtils.createInvalidPairedItemError({ nodeName: currentSource.previousNode });
			}

			return finalOutputData[currentPairedItem.item];
		},

		resolveMultiplePairings: (
			pairings: IPairedItemData[],
			source: ISourceData[],
			destinationNode: string,
			method: PairedItemMethod,
			itemIndex: number,
		): INodeExecutionData => {
			const results = pairings
				.map((pairing) => {
					try {
						const input = pairing.input || 0;
						if (input >= source.length) {
							// Means pairedItem could not be found
							return null;
						}
						return pairingResolver.getPairedItem(destinationNode, source[input], pairing, method);
					} catch {
						// Means pairedItem could not be found
						return null;
					}
				})
				.filter(Boolean) as INodeExecutionData[];

			if (results.length === 1) return results[0];

			const allSame = results.every((r) => r === results[0]);
			if (allSame) return results[0];

			throw errorUtils.createPairedItemMultipleItemsError(destinationNode, itemIndex);
		},
	};

	return {
		getPairedItem: pairingResolver.getPairedItem,
	};
};
