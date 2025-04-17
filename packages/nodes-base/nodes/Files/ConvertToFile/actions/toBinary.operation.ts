import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { JsonToBinaryOptions } from '@utils/binary';
import { createBinaryFromJson } from '@utils/binary';
import { encodeDecodeOptions } from '@utils/descriptions';
import { updateDisplayOptions } from '@utils/utilities';

export const properties: INodeProperties[] = [
	{
		displayName: 'Base64 Input Field',
		name: 'sourceProperty',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g data',
		requiresDataPath: 'single',
		description:
			"The name of the input field that contains the base64 string to convert to a file. Use dot-notation for deep fields (e.g. 'level1.level2.currentKey').",
	},
	{
		displayName: 'Put Output File in Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		placeholder: 'e.g data',
		hint: 'The name of the output binary field to put the file in',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Add Byte Order Mark (BOM)',
				description:
					'Whether to add special marker at the start of your text file. This marker helps some programs understand how to read the file correctly.',
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
				displayName: 'Data Is Base64',
				name: 'dataIsBase64',
				type: 'boolean',
				default: true,
				description: 'Whether the data is already base64 encoded',
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
			},
			{
				displayName: 'Encoding',
				name: 'encoding',
				type: 'options',
				options: encodeDecodeOptions,
				default: 'utf8',
				description: 'Choose the character set to use to encode the data',
				displayOptions: {
					hide: {
						dataIsBase64: [true],
						'@version': [{ _cnd: { gt: 1 } }],
					},
				},
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				placeholder: 'e.g. myFile',
				description: 'Name of the output file',
			},
			{
				displayName: 'MIME Type',
				name: 'mimeType',
				type: 'string',
				default: '',
				placeholder: 'e.g text/plain',
				description:
					'The MIME type of the output file. <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types" target="_blank">Common MIME types</a>.',
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

	const nodeVersion = this.getNode().typeVersion;

	for (let i = 0; i < items.length; i++) {
		try {
			const options = this.getNodeParameter('options', i, {});
			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i, 'data');
			const sourceProperty = this.getNodeParameter('sourceProperty', i) as string;

			let dataIsBase64 = true;
			if (nodeVersion === 1) {
				dataIsBase64 = options.dataIsBase64 !== false;
			}

			const jsonToBinaryOptions: JsonToBinaryOptions = {
				sourceKey: sourceProperty,
				fileName: options.fileName as string,
				mimeType: options.mimeType as string,
				dataIsBase64,
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
