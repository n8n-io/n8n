import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export class Limit implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Limit',
		name: 'limit',
		icon: 'file:limit.svg',
		group: ['transform'],
		subtitle: '',
		version: 1,
		description: 'Restrict the number of items',
		defaults: {
			name: 'Limit',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Max Items',
				name: 'maxItems',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 1,
				description: 'If there are more items than this number, some are removed',
			},
			{
				displayName: 'Keep',
				name: 'keep',
				type: 'options',
				options: [
					{
						name: 'First Items',
						value: 'firstItems',
					},
					{
						name: 'Last Items',
						value: 'lastItems',
					},
				],
				default: 'firstItems',
				description: 'When removing items, whether to keep the ones at the start or the ending',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		let returnData = items;
		const maxItems = this.getNodeParameter('maxItems', 0) as number;
		const keep = this.getNodeParameter('keep', 0) as string;

		if (maxItems > items.length) {
			return [returnData];
		}

		if (keep === 'firstItems') {
			returnData = items.slice(0, maxItems);
		} else {
			returnData = items.slice(items.length - maxItems, items.length);
		}
		return [returnData];
	}
}
