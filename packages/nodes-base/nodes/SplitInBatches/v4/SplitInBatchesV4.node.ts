import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPairedItemData,
} from 'n8n-workflow';
import { NodeConnectionTypes, deepCopy, NodeOperationError } from 'n8n-workflow';

export class SplitInBatchesV4 implements INodeType {
	// Track executions per executionId + node name
	private static executionCounters = new Map<string, number>();

	description: INodeTypeDescription = {
		displayName: 'Loop Over Items (Split in Batches)',
		name: 'splitInBatches',
		icon: 'fa:sync',
		iconColor: 'dark-green',
		group: ['organization'],
		version: 4,
		description: 'Split data into batches and iterate over each batch',
		defaults: {
			name: 'Loop Over Items',
			color: '#007755',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
		outputNames: ['done', 'loop'],
		properties: [
			{
				displayName:
					'You may not need this node — n8n nodes automatically run once for each input item. <a href="https://docs.n8n.io/getting-started/key-concepts/looping.html#using-loops-in-n8n" target="_blank">More info</a>',
				name: 'splitInBatchesNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Batch Size',
				name: 'batchSize',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 1,
				description: 'The number of items to return with each call',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Reset',
						name: 'reset',
						type: 'boolean',
						default: false,
						description:
							'Whether the node starts again from the beginning of the input items. This will treat incoming data as a new set rather than continuing with the previous items.',
					},
					{
						displayName: 'Disable Loop Protection (Unsafe)',
						name: 'disableInfiniteLoopProtection',
						type: 'boolean',
						default: false,
						description:
							'Whether to disable infinite loop protection for this node. Only enable if you are sure your workflow is correct.',
					},
					{
						displayName: 'Limit Factor',
						name: 'limitFactor',
						type: 'number',
						typeOptions: {
							minValue: 1,
						},
						default: 2,
						description:
							'Multiplier applied to the expected number of batches to determine the execution cap',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][] | null> {
		const options = this.getNodeParameter('options', 0, {});

		// If an explicit reset is requested, clear counters before any checks
		if (options.reset === true) {
			SplitInBatchesV4.resetExecutionCount(this);
		}

		// Check for infinite loops on every execution (unless disabled)
		try {
			SplitInBatchesV4.checkExecutionLimit(this);
		} catch (error) {
			// Clean up counter on error to prevent memory leaks
			SplitInBatchesV4.resetExecutionCount(this);
			throw error;
		}

		// Process items normally
		const items = this.getInputData().slice();
		const nodeContext = this.getContext('node');
		const batchSize = this.getNodeParameter('batchSize', 0) as number;

		const returnItems: INodeExecutionData[] = [];

		if (nodeContext.items === undefined || options.reset === true) {
			const sourceData = this.getInputSourceData();

			nodeContext.currentRunIndex = 0;
			nodeContext.maxRunIndex = Math.ceil(items.length / batchSize);
			nodeContext.sourceData = deepCopy(sourceData);

			// First batch
			returnItems.push.apply(returnItems, items.splice(0, batchSize));
			nodeContext.items = [...items];
			nodeContext.processedItems = [];
		} else {
			// Subsequent batches
			nodeContext.currentRunIndex += 1;
			returnItems.push.apply(
				returnItems,
				(nodeContext.items as INodeExecutionData[]).splice(0, batchSize),
			);

			const addSourceOverwrite = (pairedItem: IPairedItemData | number): IPairedItemData => {
				if (typeof pairedItem === 'number') {
					return {
						item: pairedItem,
						sourceOverwrite: nodeContext.sourceData,
					};
				}
				return {
					...pairedItem,
					sourceOverwrite: nodeContext.sourceData,
				};
			};

			function getPairedItemInformation(
				item: INodeExecutionData,
			): IPairedItemData | IPairedItemData[] {
				if (item.pairedItem === undefined) {
					return {
						item: 0,
						sourceOverwrite: nodeContext.sourceData,
					};
				}
				if (Array.isArray(item.pairedItem)) {
					return item.pairedItem.map(addSourceOverwrite);
				}
				return addSourceOverwrite(item.pairedItem);
			}

			const sourceOverwrite = this.getInputSourceData();
			const newItems = items.map((item, index) => {
				return {
					...item,
					pairedItem: {
						sourceOverwrite,
						item: index,
					},
				};
			});

			nodeContext.processedItems = [...nodeContext.processedItems, ...newItems];
			returnItems.map((item) => {
				item.pairedItem = getPairedItemInformation(item);
			});
		}

		nodeContext.noItemsLeft = nodeContext.items.length === 0;
		if (returnItems.length === 0) {
			nodeContext.done = true;
			// Normal completion - always reset counter to prevent memory leaks
			SplitInBatchesV4.resetExecutionCount(this);
			return [nodeContext.processedItems, []];
		}

		nodeContext.done = false;
		return [[], returnItems];
	}

	/**
	 * Prevents infinite loops by limiting executions
	 */
	private static checkExecutionLimit(executeFunctions: IExecuteFunctions): void {
		const nodeName = executeFunctions.getNode().name;
		const executionId = executeFunctions.getExecutionId();
		const globalKey = `${executionId}_${nodeName}`;

		const options = (executeFunctions.getNodeParameter('options', 0, {}) || {}) as {
			disableInfiniteLoopProtection?: boolean;
			limitFactor?: number;
		};
		if (options.disableInfiniteLoopProtection === true) return;

		const currentCount = SplitInBatchesV4.executionCounters.get(globalKey) || 0;
		const newCount = currentCount + 1;
		SplitInBatchesV4.executionCounters.set(globalKey, newCount);

		const inputItems = executeFunctions.getInputData();
		const batchSize = (executeFunctions.getNodeParameter('batchSize', 0) as number) || 1;
		const expectedBatches = Math.ceil(inputItems.length / Math.max(batchSize, 1));
		const factor = Math.max(Number(options.limitFactor ?? 2), 1);
		const maxExecutions = Math.min(Math.max(expectedBatches * factor, 10), 1000);

		if (newCount > maxExecutions) {
			// Clean up before throwing error
			SplitInBatchesV4.executionCounters.delete(globalKey);
			throw new NodeOperationError(
				executeFunctions.getNode(),
				`Infinite loop detected: SplitInBatches node "${nodeName}" has executed ${newCount} times, exceeding the calculated limit of ${maxExecutions} (expected ~${expectedBatches} batches). ` +
					'This indicates an infinite loop. Check that the "done" output is not connected back to this node\'s input.',
			);
		}
	}

	/**
	 * Resets execution counter when processing completes
	 */
	private static resetExecutionCount(executeFunctions: IExecuteFunctions): void {
		const nodeName = executeFunctions.getNode().name;
		const executionId = executeFunctions.getExecutionId();
		const globalKey = `${executionId}_${nodeName}`;
		SplitInBatchesV4.executionCounters.delete(globalKey);
	}

	/**
	 * Cleanup all counters for a specific execution ID to prevent memory leaks
	 */
	static cleanupExecutionCounters(executionId: string): void {
		const keysToDelete: string[] = [];
		for (const key of SplitInBatchesV4.executionCounters.keys()) {
			if (key.startsWith(`${executionId}_`)) keysToDelete.push(key);
		}
		keysToDelete.forEach((key) => SplitInBatchesV4.executionCounters.delete(key));
	}
}
