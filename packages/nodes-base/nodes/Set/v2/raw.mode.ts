import type {
	INodeExecutionData,
	IExecuteFunctions,
	INodeProperties,
	IDataObject,
	INode,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { parseJsonParameter, composeReturnItem, resolveRawData } from './helpers/utils';
import type { SetNodeOptions } from './helpers/interfaces';
import { updateDisplayOptions } from '../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'JSON Output',
		name: 'jsonOutput',
		type: 'string',
		typeOptions: {
			editor: 'json',
			editorLanguage: 'json',
			rows: 5,
		},
		default: '{\n  "my_field_1": "value",\n  "my_field_2": 1\n}',
		validateType: 'object',
		ignoreValidationDuringExecution: true,
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
	item: INodeExecutionData,
	i: number,
	options: SetNodeOptions,
	rawData: IDataObject,
	node: INode,
) {
	try {
		let newData: IDataObject;
		if (rawData.jsonOutput === undefined) {
			const json = this.getNodeParameter('jsonOutput', i) as string;
			newData = parseJsonParameter(json, node, i);
		} else {
			newData = parseJsonParameter(
				resolveRawData.call(this, rawData.jsonOutput as string, i),
				node,
				i,
			);
		}

		return composeReturnItem.call(this, i, item, newData, options);
	} catch (error) {
		if (this.continueOnFail()) {
			return { json: { error: (error as Error).message } };
		}
		throw new NodeOperationError(node, error as Error, {
			itemIndex: i,
			description: error.description,
		});
	}
}
