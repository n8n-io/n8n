import type {
	INodeExecutionData,
	IExecuteFunctions,
	INodeProperties,
	IDataObject,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { parseJsonParameter, prepareItem } from './helpers/utils';
import type { SetNodeOptions } from './helpers/interfaces';
import { getResolvables, updateDisplayOptions } from '@utils/utilities';

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
		default: '={\n  "key": "value"\n}',
	},
	// {
	// 	displayName: 'JSON Output',
	// 	name: 'jsonRaw',
	// 	type: 'string',
	// 	typeOptions: {
	// 		editor: 'jsonEditor',
	// 		rows: 5,
	// 	},
	// 	default: '{\n  "key": "value"\n}',
	// },
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
	rawData?: string,
) {
	try {
		let newData: IDataObject;
		if (rawData === undefined) {
			const json = this.getNodeParameter('jsonOutput', i) as string;
			newData = parseJsonParameter(json, this.getNode(), i);
		} else {
			const resolvables = getResolvables(rawData);

			if (resolvables.length) {
				for (const resolvable of resolvables) {
					const resolvedValue = this.evaluateExpression(`${resolvable}`, i);

					if (typeof resolvedValue === 'object' && resolvedValue !== null) {
						rawData = rawData.replace(resolvable, JSON.stringify(resolvedValue));
					} else {
						rawData = rawData.replace(resolvable, resolvedValue as string);
					}
				}
				newData = parseJsonParameter(rawData, this.getNode(), i);
			} else {
				newData = parseJsonParameter(rawData, this.getNode(), i);
			}
		}

		return prepareItem.call(this, i, item, newData, options);
	} catch (error) {
		if (this.continueOnFail()) {
			return { json: { error: (error as Error).message } };
		}
		throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
	}
}
