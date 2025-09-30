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
					{
						displayName: 'Warn Before Error',
						name: 'warnBeforeError',
						type: 'boolean',
						default: false,
						description:
							'Whether to emit a warning on the first limit breach and only error on the next one',
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
					{
						displayName: 'Signature Repeat Limit',
						name: 'signatureRepeatLimit',
						type: 'number',
						typeOptions: {
							minValue: 1,
						},
						default: 3,
						description:
							'Number of consecutive times the same input signature can repeat before raising suspicion of a loop',
					},
					{
						displayName: 'No Progress Window',
						name: 'noProgressWindow',
						type: 'number',
						typeOptions: {
							minValue: 1,
						},
						default: 3,
						description:
							'Number of consecutive executions without processing additional items before raising suspicion of a loop',
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
			// Update progress tracking for the first batch setup
			SplitInBatchesV4.updateProgress(this, 0);
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
			// Update progress tracking after adding processed items
			SplitInBatchesV4.updateProgress(this, nodeContext.processedItems.length ?? 0);
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
	static checkExecutionLimit(executeFunctions: IExecuteFunctions): void {
		const nodeName = executeFunctions.getNode().name;
		const executionId = executeFunctions.getExecutionId();
		const globalKey = `${executionId}_${nodeName}`;

		const options = (executeFunctions.getNodeParameter('options', 0, {}) || {}) as {
			disableInfiniteLoopProtection?: boolean;
			limitFactor?: number;
			warnBeforeError?: boolean;
			maxReinitializations?: number;
			signatureRepeatLimit?: number;
			noProgressWindow?: number;
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

		// Additional precision signals
		const reinitCount = SplitInBatchesV4.reinitCounters.get(globalKey) || 0;
		const maxReinit = Math.max(Number(options.maxReinitializations ?? 10), 1);

		const signature = SplitInBatchesV4.computeInputSignature(inputItems);
		const lastSig = SplitInBatchesV4.lastSignature.get(globalKey);
		if (signature === lastSig) {
			const streak = (SplitInBatchesV4.signatureSameStreak.get(globalKey) || 0) + 1;
			SplitInBatchesV4.signatureSameStreak.set(globalKey, streak);
		} else {
			SplitInBatchesV4.signatureSameStreak.set(globalKey, 0);
			SplitInBatchesV4.lastSignature.set(globalKey, signature);
		}
		const signatureRepeatLimit = Math.max(Number(options.signatureRepeatLimit ?? 3), 1);

		// Progress tracking relies on values updated during previous execution
		const noProgressWindow = Math.max(Number(options.noProgressWindow ?? 3), 1);

		const likelyStuck =
			reinitCount >= maxReinit ||
			(SplitInBatchesV4.signatureSameStreak.get(globalKey) || 0) >= signatureRepeatLimit ||
			(SplitInBatchesV4.noProgressStreak.get(globalKey) || 0) >= noProgressWindow;

		if (newCount > maxExecutions) {
			const warnBeforeError = Boolean(options.warnBeforeError);
			if (warnBeforeError) {
				const breaches = (SplitInBatchesV4.breachCounters.get(globalKey) || 0) + 1;
				SplitInBatchesV4.breachCounters.set(globalKey, breaches);
				if (breaches <= 1) return; // warn once, then error on next breach
				if (!likelyStuck && breaches <= 2) return; // allow one more if not yet likely stuck
			} else {
				// Without warn, allow exceeding up to 2x if not likely stuck
				if (!likelyStuck && newCount <= maxExecutions * 2) return;
			}

			// Clean up all counters before throwing error to avoid stale state
			SplitInBatchesV4.resetExecutionCount(executeFunctions);
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
	static resetExecutionCount(executeFunctions: IExecuteFunctions): void {
		const nodeName = executeFunctions.getNode().name;
		const executionId = executeFunctions.getExecutionId();
		const globalKey = `${executionId}_${nodeName}`;
		SplitInBatchesV4.executionCounters.delete(globalKey);
		SplitInBatchesV4.breachCounters.delete(globalKey);
		SplitInBatchesV4.reinitCounters.delete(globalKey);
		SplitInBatchesV4.lastSignature.delete(globalKey);
		SplitInBatchesV4.signatureSameStreak.delete(globalKey);
		SplitInBatchesV4.lastProcessedCount.delete(globalKey);
		SplitInBatchesV4.noProgressStreak.delete(globalKey);
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
		keysToDelete.forEach((key) => {
			SplitInBatchesV4.breachCounters.delete(key);
			SplitInBatchesV4.reinitCounters.delete(key);
			SplitInBatchesV4.lastSignature.delete(key);
			SplitInBatchesV4.signatureSameStreak.delete(key);
			SplitInBatchesV4.lastProcessedCount.delete(key);
			SplitInBatchesV4.noProgressStreak.delete(key);
		});
	}

	private static breachCounters = new Map<string, number>();
	private static reinitCounters = new Map<string, number>();
	private static lastSignature = new Map<string, string>();
	private static signatureSameStreak = new Map<string, number>();
	private static lastProcessedCount = new Map<string, number>();
	private static noProgressStreak = new Map<string, number>();

	private static incrementReinitCount(executeFunctions: IExecuteFunctions): void {
		const nodeName = executeFunctions.getNode().name;
		const executionId = executeFunctions.getExecutionId();
		const globalKey = `${executionId}_${nodeName}`;
		const current = SplitInBatchesV4.reinitCounters.get(globalKey) || 0;
		SplitInBatchesV4.reinitCounters.set(globalKey, current + 1);
	}

	private static updateProgress(executeFunctions: IExecuteFunctions, processedCount: number): void {
		const nodeName = executeFunctions.getNode().name;
		const executionId = executeFunctions.getExecutionId();
		const globalKey = `${executionId}_${nodeName}`;
		const last = SplitInBatchesV4.lastProcessedCount.get(globalKey) ?? -1;
		if (processedCount > last) {
			SplitInBatchesV4.noProgressStreak.set(globalKey, 0);
		} else {
			SplitInBatchesV4.noProgressStreak.set(
				globalKey,
				(SplitInBatchesV4.noProgressStreak.get(globalKey) || 0) + 1,
			);
		}
		SplitInBatchesV4.lastProcessedCount.set(globalKey, processedCount);
	}

	private static computeInputSignature(inputItems: INodeExecutionData[]): string {
		const len = inputItems.length;
		const first = inputItems[0]?.json ?? {};
		const keys = Object.keys(first).sort().join(',');
		return `${len}|${keys}`;
	}

	// ===== Test helpers (no runtime effect) =====
	static clearAllCountersForTest(): void {
		SplitInBatchesV4.executionCounters.clear();
		SplitInBatchesV4.breachCounters.clear();
		SplitInBatchesV4.reinitCounters.clear();
		SplitInBatchesV4.lastSignature.clear();
		SplitInBatchesV4.signatureSameStreak.clear();
		SplitInBatchesV4.lastProcessedCount.clear();
		SplitInBatchesV4.noProgressStreak.clear();
	}
	static hasCounterForTest(executionId: string, nodeName: string): boolean {
		return SplitInBatchesV4.executionCounters.has(`${executionId}_${nodeName}`);
	}
	static setCounterForTest(executionId: string, nodeName: string, value: number): void {
		SplitInBatchesV4.executionCounters.set(`${executionId}_${nodeName}`, value);
	}
}
