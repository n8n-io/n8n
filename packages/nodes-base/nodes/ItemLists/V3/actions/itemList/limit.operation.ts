import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';

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
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const data: IDataObject[] = [];
			const executionData = this.helpers.constructExecutionMetaData(wrapData(data), {
				itemData: { item: i },
			});

			returnData.push(...executionData);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({ json: { error: error.message } });
				continue;
			}
			throw error;
		}
	}

	return returnData;
}
