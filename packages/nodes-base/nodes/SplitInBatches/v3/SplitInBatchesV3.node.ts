import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPairedItemData,
} from 'n8n-workflow';
import { NodeConnectionTypes, deepCopy, NodeOperationError } from 'n8n-workflow';

export class SplitInBatchesV3 implements INodeType {
	// Global tracking across all instances within the same workflow execution
	private static executionCounters = new Map<string, number>();

	description: INodeTypeDescription = {
		displayName: 'Loop Over Items (Split in Batches)',
		name: 'splitInBatches',
		icon: 'fa:sync',
		iconColor: 'dark-green',
		group: ['organization'],
		version: 3,
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
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][] | null> {
		const options = this.getNodeParameter('options', 0, {});

		// Reset execution counter BEFORE infinite loop check when explicitly requested
		if (options.reset === true) {
			SplitInBatchesV3.resetExecutionCount(this);
		}

		// PAY-2940: Check for infinite loops on EVERY execution
		try {
			SplitInBatchesV3.checkExecutionLimit(this);
		} catch (error) {
			// Clean up counter on error to prevent memory leaks
			SplitInBatchesV3.resetExecutionCount(this);
			throw error;
		}

		// Get the input data and create a new array so that we can remove
		// items without a problem
		const items = this.getInputData().slice();

		const nodeContext = this.getContext('node');
		const batchSize = this.getNodeParameter('batchSize', 0) as number;

		const returnItems: INodeExecutionData[] = [];

		if (nodeContext.items === undefined || options.reset === true) {
			// Is the first time the node runs or reset is requested

			const sourceData = this.getInputSourceData();

			nodeContext.currentRunIndex = 0;
			nodeContext.maxRunIndex = Math.ceil(items.length / batchSize);
			nodeContext.sourceData = deepCopy(sourceData);

			// Get the items which should be returned
			returnItems.push.apply(returnItems, items.splice(0, batchSize));

			// Save the incoming items to be able to return them for later runs
			nodeContext.items = [...items];

			// Reset processedItems as they get only added starting from the first iteration
			nodeContext.processedItems = [];
		} else {
			// The node has been called before. So return the next batch of items.
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
			// The infinite loop protection happens in checkExecutionLimit, not here
			SplitInBatchesV3.resetExecutionCount(this);
			return [nodeContext.processedItems, []];
		}

		nodeContext.done = false;

		return [[], returnItems];
	}

	/**
	 * Prevents infinite loops by limiting executions (PAY-2940)
	 */
	private static checkExecutionLimit(executeFunctions: IExecuteFunctions): void {
		const nodeName = executeFunctions.getNode().name;
		const executionId = executeFunctions.getExecutionId();
		const globalKey = `${executionId}_${nodeName}`;

		// Initialize and increment counter in static map
		const currentCount = SplitInBatchesV3.executionCounters.get(globalKey) || 0;
		const newCount = currentCount + 1;
		SplitInBatchesV3.executionCounters.set(globalKey, newCount);

		// Calculate dynamic limit based on input data and batch size
		const inputItems = executeFunctions.getInputData();
		const batchSize = executeFunctions.getNodeParameter('batchSize', 0) as number;

		// Expected batches = ceil(inputItems / batchSize) + some buffer for edge cases
		// Minimum of 10 to handle small datasets, maximum of 1000 to prevent true infinite loops
		const expectedBatches = Math.ceil(inputItems.length / Math.max(batchSize, 1));
		const bufferMultiplier = 2; // Allow 2x expected batches for safety
		const maxExecutions = Math.min(Math.max(expectedBatches * bufferMultiplier, 10), 1000);

		if (newCount > maxExecutions) {
			// Clean up before throwing error
			SplitInBatchesV3.executionCounters.delete(globalKey);
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

		SplitInBatchesV3.executionCounters.delete(globalKey);
	}

	/**
	 * Cleanup all counters for a specific execution ID to prevent memory leaks
	 */
	static cleanupExecutionCounters(executionId: string): void {
		const keysToDelete: string[] = [];
		for (const key of SplitInBatchesV3.executionCounters.keys()) {
			if (key.startsWith(`${executionId}_`)) {
				keysToDelete.push(key);
			}
		}
		keysToDelete.forEach((key) => SplitInBatchesV3.executionCounters.delete(key));
	}
}
