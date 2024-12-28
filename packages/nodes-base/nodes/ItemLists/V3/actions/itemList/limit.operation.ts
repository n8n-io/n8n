import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

const properties: INodeProperties[] = [
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
];

const displayOptions = {
	show: {
		resource: ['itemList'],
		operation: ['limit'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	let returnData = items;
	const maxItems = this.getNodeParameter('maxItems', 0) as number;
	const keep = this.getNodeParameter('keep', 0) as string;

	if (maxItems > items.length) {
		return returnData;
	}

	if (keep === 'firstItems') {
		returnData = items.slice(0, maxItems);
	} else {
		returnData = items.slice(items.length - maxItems, items.length);
	}
	return returnData;
}
