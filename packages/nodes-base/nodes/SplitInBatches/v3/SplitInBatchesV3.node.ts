import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPairedItemData,
} from 'n8n-workflow';
import {
	NodeConnectionTypes,
	deepCopy,
	NodeOperationError,
	LoggerProxy as Logger,
} from 'n8n-workflow';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';

export class SplitInBatchesV3 implements INodeType {
	// Node-specific safeguards against infinite loops (PAY-2940)
	private static readonly EXECUTION_COUNT_KEY = 'splitInBatchesExecutionCount';
	private static readonly WORKFLOW_START_TIME_KEY = 'workflowStartTime';

	/**
	 * Generate execution-specific context keys to prevent state leakage between workflow runs
	 */
	private static getExecutionContextKey(
		executeFunctions: IExecuteFunctions,
		baseKey: string,
	): string {
		const executionId = executeFunctions.getExecutionId();
		return `${baseKey}_${executionId}`;
	}

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
		// Get the input data and create a new array so that we can remove
		// items without a problem
		const items = this.getInputData().slice();

		const nodeContext = this.getContext('node');

		// PAY-2940: Node-specific safeguards against infinite loops
		SplitInBatchesV3.enforceExecutionLimits(this, nodeContext);

		const batchSize = this.getNodeParameter('batchSize', 0) as number;

		const returnItems: INodeExecutionData[] = [];

		const options = this.getNodeParameter('options', 0, {});

		if (nodeContext.items === undefined || options.reset === true) {
			// Is the first time the node runs or reset is requested

			// PAY-2940: Reset execution counters on reset or first run
			if (options.reset === true) {
				SplitInBatchesV3.resetExecutionCounters(this, nodeContext);
			}

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
			// PAY-2940: Reset execution counter on legitimate completion
			SplitInBatchesV3.resetExecutionCounters(this, nodeContext);
			return [nodeContext.processedItems, []];
		}

		nodeContext.done = false;

		return [[], returnItems];
	}

	/**
	 * Enforces execution limits to prevent infinite loops (PAY-2940)
	 */
	private static enforceExecutionLimits(
		executeFunctions: IExecuteFunctions,
		nodeContext: any,
	): void {
		const currentTime = Date.now();

		// Get configurable execution limit from workflow configuration
		const workflowsConfig = Container.get(GlobalConfig).workflows;
		const maxExecutions = workflowsConfig.splitInBatchesMaxExecutions;

		// Use execution-specific keys to prevent state leakage between workflow runs
		const executionCountKey = SplitInBatchesV3.getExecutionContextKey(
			executeFunctions,
			SplitInBatchesV3.EXECUTION_COUNT_KEY,
		);
		const startTimeKey = SplitInBatchesV3.getExecutionContextKey(
			executeFunctions,
			SplitInBatchesV3.WORKFLOW_START_TIME_KEY,
		);

		// Initialize counters if this is a new workflow execution
		if (!nodeContext[startTimeKey] || !nodeContext[executionCountKey]) {
			nodeContext[startTimeKey] = currentTime;
			nodeContext[executionCountKey] = 0;
		}

		// Increment execution counter (atomic operation)
		nodeContext[executionCountKey] = (nodeContext[executionCountKey] || 0) + 1;

		const executionCount = nodeContext[executionCountKey];

		// Check if we've exceeded the maximum execution limit
		if (executionCount > maxExecutions) {
			const executionTime = Math.round((currentTime - nodeContext[startTimeKey]) / 1000);

			// Log SplitInBatches loop detection for monitoring (PAY-2940)
			Logger.warn('SplitInBatches execution limit exceeded', {
				executionCount,
				maxExecutions,
				executionTimeSeconds: executionTime,
				nodeName: executeFunctions.getNode().name,
				nodeType: executeFunctions.getNode().type,
				executionId: executeFunctions.getExecutionId(),
			});

			throw new NodeOperationError(
				executeFunctions.getNode(),
				'SplitInBatches node has executed ' +
					executionCount +
					' times, which exceeds the safety limit of ' +
					maxExecutions +
					'. ' +
					'This likely indicates an infinite loop in your workflow. ' +
					'Common causes: ' +
					"1) The 'done' output is connected back to this node's input, " +
					'2) Missing workflow termination conditions, ' +
					'3) Incorrect batch size configuration. ' +
					'Execution time: ' +
					executionTime +
					's. ' +
					'Please check your workflow connections and ensure the SplitInBatches node has a proper completion path.',
			);
		}
	}

	/**
	 * Resets execution counters when the node legitimately completes processing (PAY-2940)
	 */
	private static resetExecutionCounters(
		executeFunctions: IExecuteFunctions,
		nodeContext: any,
	): void {
		const executionCountKey = SplitInBatchesV3.getExecutionContextKey(
			executeFunctions,
			SplitInBatchesV3.EXECUTION_COUNT_KEY,
		);
		const startTimeKey = SplitInBatchesV3.getExecutionContextKey(
			executeFunctions,
			SplitInBatchesV3.WORKFLOW_START_TIME_KEY,
		);

		delete nodeContext[executionCountKey];
		delete nodeContext[startTimeKey];
	}
}
