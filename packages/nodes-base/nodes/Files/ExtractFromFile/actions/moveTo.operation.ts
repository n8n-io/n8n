import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { BINARY_ENCODING, NodeOperationError, deepCopy, jsonParse } from 'n8n-workflow';

import { encodeDecodeOptions } from '@utils/descriptions';
import { updateDisplayOptions } from '@utils/utilities';

import get from 'lodash/get';
import set from 'lodash/set';
import unset from 'lodash/unset';

import iconv from 'iconv-lite';

export const properties: INodeProperties[] = [
	{
		displayName: 'File Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		placeholder: 'e.g data',
		description: 'Name of the binary property from which to extract the data',
	},
	{
		displayName: 'Destination Key',
		name: 'destinationKey',
		type: 'string',
		default: 'data',
		required: true,
		placeholder: 'e.g data',
		description: 'The name of the JSON key to which extracted data would be written',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'File Encoding',
				name: 'encoding',
				type: 'options',
				options: encodeDecodeOptions,
				default: 'utf8',
				description: 'Specify the encoding of the file, defaults to UTF-8',
			},
			{
				displayName: 'Strip BOM',
				name: 'stripBOM',
				displayOptions: {
					show: {
						encoding: ['utf8', 'cesu8', 'ucs2'],
					},
				},
				type: 'boolean',
				default: true,
				description:
					'Whether to strip the BOM from the file,this could help in an environment where the presence of the BOM is causing issues or inconsistencies',
			},
			{
				displayName: 'Keep Source',
				name: 'keepSource',
				type: 'options',
				default: 'json',
				options: [
					{
						name: 'JSON',
						value: 'json',
					},
					{
						name: 'Binary',
						value: 'binary',
					},
					{
						name: 'Both',
						value: 'both',
					},
				],
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['binaryToPropery', 'fromJson', 'text'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	operation: string,
) {
	const returnData: INodeExecutionData[] = [];

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		try {
			const item = items[itemIndex];
			const options = this.getNodeParameter('options', itemIndex);
			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex);

			const newItem: INodeExecutionData = {
				json: {},
				pairedItem: { item: itemIndex },
			};

			const value = get(item.binary, binaryPropertyName);

			if (!value) continue;

			const encoding = (options.encoding as string) || 'utf8';
			const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);

			if (options.keepSource && options.keepSource !== 'binary') {
				newItem.json = deepCopy(item.json);
			}

			let convertedValue: string | IDataObject;
			if (operation !== 'binaryToPropery') {
				convertedValue = iconv.decode(buffer, encoding, {
					stripBOM: options.stripBOM as boolean,
				});
			} else {
				convertedValue = Buffer.from(buffer).toString(BINARY_ENCODING);
			}

			if (operation === 'fromJson') {
				convertedValue = jsonParse(convertedValue);
			}

			const destinationKey = this.getNodeParameter('destinationKey', itemIndex, '') as string;
			set(newItem.json, destinationKey, convertedValue);

			if (options.keepSource === 'binary' || options.keepSource === 'both') {
				newItem.binary = item.binary;
			} else {
				// this binary data would not be included, but there also might be other binary data
				// which should be included, copy it over and unset current binary data
				newItem.binary = deepCopy(item.binary);
				unset(newItem.binary, binaryPropertyName);
			}

			returnData.push(newItem);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: {
						error: error.message,
					},
					pairedItem: {
						item: itemIndex,
					},
				});
				continue;
			}
			throw new NodeOperationError(this.getNode(), error, { itemIndex });
		}
	}

	return returnData;
}
