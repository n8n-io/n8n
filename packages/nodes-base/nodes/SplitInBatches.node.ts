import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';


export class SplitInBatches implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Split In Batches',
		name: 'splitInBatches',
		icon: 'fa:th-large',
		group: ['organization'],
		version: 1,
		description: 'Saves the originally incoming data and with each itteration it returns a predefined amount of them.',
		defaults: {
			name: 'SplitInBatches',
			color: '#007755',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Batch Size',
				name: 'batchSize',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 10,
				description: 'The number of items to return with each call.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][] | null> {
		// Get the input data and create a new array so that we can remove
		// items without a problem
		const items = this.getInputData().slice();

		const nodeContext = this.getContext('node');

		const batchSize = this.getNodeParameter('batchSize', 0) as number;

		const returnItems: INodeExecutionData[] = [];

		if (nodeContext.items === undefined) {
			// Is the first time the node runs

			nodeContext.currentRunIndex = 0;
			nodeContext.maxRunIndex = Math.ceil(items.length / batchSize);

			// Get the items which should be returned
			returnItems.push.apply(returnItems, items.splice(0, batchSize));

			// Set the other items to be saved in the context to return at later runs
			nodeContext.items = items;
		}  else {
			// The node has been called before. So return the next batch of items.
			nodeContext.currentRunIndex += 1;
			returnItems.push.apply(returnItems, nodeContext.items.splice(0, batchSize));
		}

		nodeContext.noItemsLeft = nodeContext.items.length === 0;

		if (returnItems.length === 0) {
			// No data left to return so stop execution of the branch
			return null;
		}

		return this.prepareOutputData(returnItems);
	}
}
