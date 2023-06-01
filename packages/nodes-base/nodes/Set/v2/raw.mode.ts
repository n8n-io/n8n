import type { IExecuteFunctions } from 'n8n-core';
import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../utils/utilities';
import { parseJsonParameter, prepareItem } from './utils';

const properties: INodeProperties[] = [
	{
		displayName: 'JSON Output',
		name: 'json',
		type: 'string',
		typeOptions: {
			editor: 'json',
		},
		default: '{\n  "key": "value"\n}',
	},
	{
		displayName: 'Include Other Input Fields Too',
		name: 'includeOtherFields',
		type: 'boolean',
		default: true,
		description: 'Whether to include all input fields along with added or edited fields',
	},
];

const displayOptions = {
	show: {
		mode: ['raw'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	duplicate: number,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const includeOtherFields = this.getNodeParameter('includeOtherFields', i) as boolean;
			const json = this.getNodeParameter('json', i) as string;
			const setData = parseJsonParameter(json, this.getNode(), i);

			const newItem = prepareItem(items[i], setData, includeOtherFields);

			for (let j = 0; j <= duplicate; j++) {
				returnData.push(newItem);
			}
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({ json: { error: error.message } });
				continue;
			}
			throw new NodeOperationError(this.getNode(), error as Error);
		}
	}

	return returnData;
}
