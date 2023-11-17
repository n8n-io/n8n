import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { NodeOperationError } from 'n8n-workflow';

import type { JsonToBinaryOptions } from '@utils/binary';
import { createBinaryFromJson } from '@utils/binary';
import { encodeDecodeOptions } from '@utils/descriptions';
import { updateDisplayOptions } from '@utils/utilities';

export const properties: INodeProperties[] = [
	{
		displayName: 'File Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		placeholder: 'e.g data',
		description: 'Name of the binary property to which to write the data of the file',
	},
	{
		displayName: 'Source Property',
		name: 'sourceProperty',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g data',
		description:
			'The name of the JSON key to get data from. It is also possible to define deep keys by using dot-notation like for example: "level1.level2.currentKey".',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Data Is Base64',
				name: 'dataIsBase64',
				type: 'boolean',
				default: true,
				description: 'Whether the data is already base64 encoded',
			},
			{
				displayName: 'Encoding',
				name: 'encoding',
				type: 'options',
				options: encodeDecodeOptions,
				default: 'utf8',
				description: 'Set the encoding of the data stream',
			},
			{
				displayName: 'Add BOM',
				name: 'addBOM',
				displayOptions: {
					show: {
						encoding: ['utf8', 'cesu8', 'ucs2'],
					},
				},
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				description: 'File name to set in binary data',
			},
			{
				displayName: 'MIME Type',
				name: 'mimeType',
				type: 'string',
				default: '',
				placeholder: 'e.g text/plain',
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['toBinary'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const options = this.getNodeParameter('options', i, {});
			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i, 'data');
			const sourceProperty = this.getNodeParameter('sourceProperty', i) as string;

			const jsonToBinaryOptions: JsonToBinaryOptions = {
				sourceKey: sourceProperty,
				fileName: options.fileName as string,
				mimeType: options.mimeType as string,
				dataIsBase64: options.dataIsBase64 !== false,
				encoding: options.encoding as string,
				addBOM: options.addBOM as boolean,
				itemIndex: i,
			};

			const binaryData = await createBinaryFromJson.call(this, items[i].json, jsonToBinaryOptions);

			const newItem: INodeExecutionData = {
				json: {},
				binary: {
					[binaryPropertyName]: binaryData,
				},
				pairedItem: { item: i },
			};

			returnData.push(newItem);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: {
						error: error.message,
					},
					pairedItem: {
						item: i,
					},
				});
				continue;
			}
			throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
		}
	}

	return returnData;
}
