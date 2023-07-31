import type { IExecuteFunctions } from 'n8n-core';
import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../utils/utilities';

import { parseJsonParameter, prepareItem } from './helpers/utils';
import type { SetNodeOptions } from './helpers/interfaces';

const properties: INodeProperties[] = [
	{
		displayName: 'JSON Output',
		name: 'json',
		type: 'string',
		typeOptions: {
			editor: 'json',
			rows: 5,
		},
		default: '={\n  "key": "value"\n}',
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
	i: number,
	options: SetNodeOptions,
) {
	try {
		const json = this.getNodeParameter('json', i) as string;
		const newData = parseJsonParameter(json, this.getNode(), i);

		return prepareItem.call(this, i, items[i], newData, options);
	} catch (error) {
		if (this.continueOnFail()) {
			return { json: { error: error.message } };
		}
		throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
	}
}
