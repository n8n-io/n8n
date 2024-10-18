/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError, deepCopy } from 'n8n-workflow';
import { getPairedItemInformation } from './utils';
import type { SplitInBatchesContext } from './types';

export class SplitInBatchesV4 implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Loop Over Items (Split in Batches)',
		name: 'splitInBatches',
		icon: 'fa:sync',
		group: ['organization'],
		version: 4,
		description: 'Split data into batches and iterate over each batch',
		defaults: {
			name: 'Loop Over Items',
			color: '#007755',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [
			{ type: NodeConnectionType.Main },
			{ type: NodeConnectionType.Main, maxConnections: 1 },
		],
		inputNames: ['input', 'loop'],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['main', 'main'],
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
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][] | null> {
		const inputItems = this.getInputData(0).slice();
		const loopItems = this.getInputData(1);

		const nodeContext = this.getContext('node') as SplitInBatchesContext;

		const batchSize = this.getNodeParameter('batchSize', 0) as number;
		const source = this.getInputSourceData();

		const firstRun = !nodeContext.items;

		if (nodeContext.done && loopItems.length > 0) {
			throw new NodeOperationError(
				this.getNode(),
				"The 'loop' input was triggered when no more items were left. Make sure to not create any branches within your loop.",
			);
		}

		if (firstRun) {
			nodeContext.items = [];
			nodeContext.processedItems = [];
			nodeContext.currentRunIndex = 0;
			nodeContext.sourceData = deepCopy(source);
			nodeContext.noItemsLeft = false;
			nodeContext.done = false;
		}

		if (inputItems.length > 0) {
			nodeContext.items = nodeContext.items.concat(inputItems);
		}

		if (loopItems.length > 0) {
			const newProcessedItems = loopItems.map((item, index) => {
				item.pairedItem = {
					sourceOverwrite: source,
					item: index,
				};
				return item;
			});

			nodeContext.processedItems = nodeContext.processedItems.concat(newProcessedItems);
		}

		const noItemsLeft = nodeContext.items.length === 0;
		nodeContext.noItemsLeft = noItemsLeft;
		nodeContext.done = noItemsLeft;

		if (!firstRun) {
			nodeContext.currentRunIndex += 1;
		}

		if (noItemsLeft) {
			return [nodeContext.processedItems, []];
		}

		const nextBatch = nodeContext.items.splice(0, batchSize).map((item) => {
			item.pairedItem = getPairedItemInformation(item, source);
			return item;
		});
		return [[], nextBatch];
	}
}
