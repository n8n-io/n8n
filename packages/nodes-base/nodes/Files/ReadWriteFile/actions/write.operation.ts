import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';
import { BINARY_ENCODING, NodeApiError } from 'n8n-workflow';
import type { Readable } from 'stream';

import { updateDisplayOptions } from '@utils/utilities';

import { errorMapper } from '../helpers/utils';

export const properties: INodeProperties[] = [
	{
		displayName: 'File Path and Name',
		name: 'fileName',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. /data/example.jpg',
		description:
			'Path and name of the file that should be written. Also include the file extension.',
	},
	{
		displayName: 'Input Binary Field',
		name: 'dataPropertyName',
		type: 'string',
		default: 'data',
		placeholder: 'e.g. data',
		required: true,
		hint: 'The name of the input binary field containing the file to be written',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Append',
				name: 'append',
				type: 'boolean',
				default: false,
				description:
					"Whether to append to an existing file. While it's commonly used with text files, it's not limited to them, however, it wouldn't be applicable for file types that have a specific structure like most binary formats.",
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['write'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];
	let fileName;

	let item: INodeExecutionData;
	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		try {
			const dataPropertyName = this.getNodeParameter('dataPropertyName', itemIndex);
			fileName = this.getNodeParameter('fileName', itemIndex) as string;
			const options = this.getNodeParameter('options', itemIndex, {});
			const flag: string = options.append ? 'a' : 'w';

			item = items[itemIndex];

			const newItem: INodeExecutionData = {
				json: {},
				pairedItem: {
					item: itemIndex,
				},
			};
			Object.assign(newItem.json, item.json);

			const binaryData = this.helpers.assertBinaryData(itemIndex, dataPropertyName);

			let fileContent: Buffer | Readable;
			if (binaryData.id) {
				fileContent = await this.helpers.getBinaryStream(binaryData.id);
			} else {
				fileContent = Buffer.from(binaryData.data, BINARY_ENCODING);
			}

			// Write the file to disk
			await this.helpers.writeContentToFile(fileName, fileContent, flag);

			if (item.binary !== undefined) {
				// Create a shallow copy of the binary data so that the old
				// data references which do not get changed still stay behind
				// but the incoming data does not get changed.
				newItem.binary = {};
				Object.assign(newItem.binary, item.binary);
			}

			// Add the file name to data
			newItem.json.fileName = fileName;

			returnData.push(newItem);
		} catch (error) {
			const nodeOperatioinError = errorMapper.call(this, error, itemIndex, {
				filePath: fileName,
				operation: 'write',
			});
			if (this.continueOnFail()) {
				returnData.push({
					json: {
						error: nodeOperatioinError.message,
					},
					pairedItem: {
						item: itemIndex,
					},
				});
				continue;
			}
			throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex });
		}
	}

	return returnData;
}
