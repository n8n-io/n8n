import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPairedItemData,
} from 'n8n-workflow';
import { NodeConnectionTypes, deepCopy, NodeOperationError } from 'n8n-workflow';

export class SplitInBatchesV4 implements INodeType {
	// Infinite loop protection constants
	private static readonly MIN_EXECUTION_LIMIT = 10; // Minimum protection threshold for small datasets
	private static readonly MAX_EXECUTION_LIMIT = 1000; // Safety cap for large datasets to prevent runaway executions
	private static readonly DEFAULT_LIMIT_FACTOR = 2; // Default multiplier for expected batches
	private static readonly DEFAULT_MAX_REINIT = 10; // Default max re-initializations before considered stuck

	// Track executions per executionId + node name
	private static executionCounters = new Map<string, number>();
	private static reinitCounters = new Map<string, number>();
	// Cache expected batch count from first execution to avoid recalculation on changing input
	private static expectedBatchesCache = new Map<string, number>();

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
							'Whether to disable loop protection. ⚠️ DANGER: Disabling protection can cause runaway executions that freeze or crash n8n. Only use for advanced debugging. NOT recommended for production. Requires N8N_ALLOW_DISABLE_LOOP_PROTECTION=true to take effect.',
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
					{
						displayName: 'Max Reinitializations',
						name: 'maxReinitializations',
						type: 'number',
						typeOptions: {
							minValue: 1,
						},
						default: 10,
						description:
							'Maximum number of times the node may re-initialize within a single execution before being considered stuck',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][] | null> {
		const options = this.getNodeParameter('options', 0, {});

		// Version-locked structural guard (v4: 'done' is output index 0)
		const outgoing = this.getOutgoingConnections(this.getNode().name, NodeConnectionTypes.Main);
		const doneIndex = 0;
		if (
			Array.isArray(outgoing?.[doneIndex]) &&
			outgoing![doneIndex]!.some((c) => c?.node === this.getNode().name)
		) {
			throw new NodeOperationError(
				this.getNode(),
				'Stopped execution: Loop Over Items (Split in Batches) node has its "done" output connected back to its own input, which causes an infinite loop. Disconnect the "done" output from this node\'s input.',
			);
		}

		// Check for infinite loops on every execution (unless disabled)
		try {
			SplitInBatchesV4.checkExecutionLimit(this);
		} catch (error) {
			// Clean up counter on error to prevent memory leaks
			SplitInBatchesV4.resetExecutionCount(this);
			throw error;
		}

		// If an explicit reset is requested, clear counters after the check
		if (options.reset === true) {
			SplitInBatchesV4.resetExecutionCount(this);
		}

		// Process items normally
		const items = this.getInputData().slice();
		const nodeContext = this.getContext('node');
		const batchSize = this.getNodeParameter('batchSize', 0) as number;

		const returnItems: INodeExecutionData[] = [];

		if (nodeContext.items === undefined || options.reset === true) {
			// Re-initialization within the same execution
			SplitInBatchesV4.incrementReinitCount(this);
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
			const result: [INodeExecutionData[], INodeExecutionData[]] = [nodeContext.processedItems, []];
			// Normal completion - reset counter AFTER preparing result but before return
			SplitInBatchesV4.resetExecutionCount(this);
			return result;
		}

		nodeContext.done = false;
		return [[], returnItems];
	}

	/**
	 * Prevents infinite loops by limiting executions using simple, reliable heuristics
	 */
	static checkExecutionLimit(executeFunctions: IExecuteFunctions): void {
		const nodeName = executeFunctions.getNode().name;
		const executionId = executeFunctions.getExecutionId();
		const globalKey = `${executionId}_${nodeName}`;

		const options = (executeFunctions.getNodeParameter('options', 0, {}) || {}) as {
			disableInfiniteLoopProtection?: boolean;
			limitFactor?: number;
			maxReinitializations?: number;
		};
		if (options.disableInfiniteLoopProtection === true) {
			// Check if environment variable allows disabling protection
			const allowDisable = process.env.N8N_ALLOW_DISABLE_LOOP_PROTECTION === 'true';
			if (!allowDisable) {
				throw new NodeOperationError(
					executeFunctions.getNode(),
					'Disabling infinite loop protection requires setting N8N_ALLOW_DISABLE_LOOP_PROTECTION=true environment variable. This is a dangerous option that can cause system instability.',
				);
			}
			return;
		}

		const currentCount = SplitInBatchesV4.executionCounters.get(globalKey) || 0;
		const newCount = currentCount + 1;
		SplitInBatchesV4.executionCounters.set(globalKey, newCount);

		// Calculate expected batches based on initial input size
		// Use cached value if available, otherwise calculate from current input
		let expectedBatches = SplitInBatchesV4.expectedBatchesCache.get(globalKey);
		if (expectedBatches === undefined) {
			// First execution: check if node context has stored the initial item count
			const nodeContext = executeFunctions.getContext('node') as {
				maxRunIndex?: number;
			};
			const inputItems = executeFunctions.getInputData();
			const batchSize = (executeFunctions.getNodeParameter('batchSize', 0) as number) || 1;

			// If this is truly the first execution, use current input length
			// Otherwise, use stored maxRunIndex if available (accounts for items already processed)
			if (typeof nodeContext.maxRunIndex === 'number') {
				expectedBatches = nodeContext.maxRunIndex;
			} else {
				// First time through: calculate from input items
				expectedBatches = Math.ceil(inputItems.length / Math.max(batchSize, 1));
			}

			SplitInBatchesV4.expectedBatchesCache.set(globalKey, expectedBatches);
		}

		// Safely parse limitFactor with NaN protection
		const rawFactor = Number(options.limitFactor ?? SplitInBatchesV4.DEFAULT_LIMIT_FACTOR);
		const factor =
			Number.isFinite(rawFactor) && rawFactor >= 1
				? rawFactor
				: SplitInBatchesV4.DEFAULT_LIMIT_FACTOR;
		const maxExecutions = Math.min(
			Math.max(expectedBatches * factor, SplitInBatchesV4.MIN_EXECUTION_LIMIT),
			SplitInBatchesV4.MAX_EXECUTION_LIMIT,
		);

		// Check re-initialization count as additional signal
		const reinitCount = SplitInBatchesV4.reinitCounters.get(globalKey) || 0;
		const rawMaxReinit = Number(
			options.maxReinitializations ?? SplitInBatchesV4.DEFAULT_MAX_REINIT,
		);
		const maxReinit =
			Number.isFinite(rawMaxReinit) && rawMaxReinit >= 1
				? rawMaxReinit
				: SplitInBatchesV4.DEFAULT_MAX_REINIT;
		const likelyStuck = reinitCount >= maxReinit;

		// Determine actual limit based on stuck detection
		const actualLimit = likelyStuck ? maxExecutions : maxExecutions * 2;

		if (newCount > actualLimit) {
			// Prepare error message before cleanup (preserve debugging context)
			const errorMessage =
				`Infinite loop detected: SplitInBatches node "${nodeName}" has executed ${newCount} times, exceeding the calculated limit of ${actualLimit} (expected ~${expectedBatches} batches, factor: ${factor}x${likelyStuck ? ', stuck: high reinit count' : ''}). ` +
				'This indicates an infinite loop. Check that the "done" output is not connected back to this node\'s input.';

			// Clean up all counters before throwing error to avoid stale state
			SplitInBatchesV4.resetExecutionCount(executeFunctions);

			throw new NodeOperationError(executeFunctions.getNode(), errorMessage);
		}
	}

	/**
	 * Resets execution counter when processing completes
	 */
	static resetExecutionCount(executeFunctions: IExecuteFunctions): void {
		const nodeName = executeFunctions.getNode().name;
		const executionId = executeFunctions.getExecutionId();
		const globalKey = `${executionId}_${nodeName}`;
		SplitInBatchesV4.executionCounters.delete(globalKey);
		SplitInBatchesV4.reinitCounters.delete(globalKey);
		SplitInBatchesV4.expectedBatchesCache.delete(globalKey);
	}

	/**
	 * Cleanup all counters for a specific execution ID to prevent memory leaks.
	 *
	 * This method is provided for external cleanup integration (e.g., from workflow engine hooks)
	 * but is not strictly required since the node handles cleanup in three ways:
	 * 1. On normal completion (line 208 - resetExecutionCount call)
	 * 2. On infinite loop detection error (line 252 - before throwing error)
	 * 3. On explicit reset option (when user manually resets the node)
	 *
	 * Use this method from workflow lifecycle hooks as an additional safety measure
	 * to clean up any orphaned counters from abnormal terminations.
	 */
	static cleanupExecutionCounters(executionId: string): void {
		const keysToDelete: string[] = [];
		for (const key of SplitInBatchesV4.executionCounters.keys()) {
			if (key.startsWith(`${executionId}_`)) keysToDelete.push(key);
		}
		keysToDelete.forEach((key) => {
			SplitInBatchesV4.executionCounters.delete(key);
			SplitInBatchesV4.reinitCounters.delete(key);
			SplitInBatchesV4.expectedBatchesCache.delete(key);
		});
	}

	private static incrementReinitCount(executeFunctions: IExecuteFunctions): void {
		const nodeName = executeFunctions.getNode().name;
		const executionId = executeFunctions.getExecutionId();
		const globalKey = `${executionId}_${nodeName}`;
		const current = SplitInBatchesV4.reinitCounters.get(globalKey) || 0;
		SplitInBatchesV4.reinitCounters.set(globalKey, current + 1);
	}

	// ===== Test helpers (no runtime effect) =====
	static clearAllCountersForTest(): void {
		SplitInBatchesV4.executionCounters.clear();
		SplitInBatchesV4.reinitCounters.clear();
		SplitInBatchesV4.expectedBatchesCache.clear();
	}
	static hasCounterForTest(executionId: string, nodeName: string): boolean {
		return SplitInBatchesV4.executionCounters.has(`${executionId}_${nodeName}`);
	}
	static setCounterForTest(executionId: string, nodeName: string, value: number): void {
		SplitInBatchesV4.executionCounters.set(`${executionId}_${nodeName}`, value);
	}
}
