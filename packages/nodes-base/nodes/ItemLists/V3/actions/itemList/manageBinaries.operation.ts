import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from '@utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Perform ...',
		name: 'perform',
		type: 'options',
		options: [
			{
				name: 'Merge Binaries Into a Single Item',
				value: 'merge',
			},
			{
				name: 'Split Each Binary Into a Separate Item',
				value: 'split',
			},
		],
		default: 'merge',
	},
];

const displayOptions = {
	show: {
		resource: ['itemList'],
		operation: ['manageBinaries'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData = [] as INodeExecutionData[];
	const perform = this.getNodeParameter('perform', 0) as string;

	if (perform === 'merge') {
		const newItem = {
			json: {},
		} as INodeExecutionData;

		for (const item of items) {
			if (item.binary === undefined) continue;

			for (const [index, key] of Object.keys(item.binary).entries()) {
				if (!newItem.binary) newItem.binary = {};

				newItem.binary[`${key}${index}`] = item.binary[key];
			}
		}

		returnData.push(newItem);
	} else {
		for (const item of items) {
			if (item.binary === undefined) continue;

			for (const key of Object.keys(item.binary)) {
				returnData.push({
					json: item.json,
					binary: {
						[key]: item.binary[key],
					},
				} as INodeExecutionData);
			}
		}
	}

	return returnData;
}
