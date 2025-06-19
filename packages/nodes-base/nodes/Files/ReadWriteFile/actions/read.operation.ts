import glob from 'fast-glob';
import { NodeApiError } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { errorMapper, escapeSpecialCharacters } from '../helpers/utils';

export const properties: INodeProperties[] = [
	{
		displayName: 'File(s) Selector',
		name: 'fileSelector',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. /home/user/Pictures/**/*.png',
		hint: 'Supports patterns, learn more <a href="https://github.com/micromatch/picomatch#basic-globbing" target="_blank">here</a>',
		description:
			"Specify a file's path or path pattern to read multiple files. Always use forward-slashes for path separator even on Windows.",
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'File Extension',
				name: 'fileExtension',
				type: 'string',
				default: '',
				placeholder: 'e.g. zip',
				description: 'Extension of the file in the output binary',
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				placeholder: 'e.g. data.zip',
				description: 'Name of the file in the output binary',
			},
			{
				displayName: 'Mime Type',
				name: 'mimeType',
				type: 'string',
				default: '',
				placeholder: 'e.g. application/zip',
				description: 'Mime type of the file in the output binary',
			},
			{
				displayName: 'Put Output File in Field',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				placeholder: 'e.g. data',
				description: "By default 'data' is used",
				hint: 'The name of the output binary field to put the file in',
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['read'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];
	let fileSelector;

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		try {
			fileSelector = String(this.getNodeParameter('fileSelector', itemIndex));

			fileSelector = escapeSpecialCharacters(fileSelector);

			if (/^[a-zA-Z]:/.test(fileSelector)) {
				fileSelector = fileSelector.replace(/\\\\/g, '/');
			}

			const options = this.getNodeParameter('options', itemIndex, {});

			let dataPropertyName = 'data';

			if (options.dataPropertyName) {
				dataPropertyName = options.dataPropertyName as string;
			}

			const files = await glob(fileSelector);

			const newItems: INodeExecutionData[] = [];
			for (const filePath of files) {
				const stream = await this.helpers.createReadStream(filePath);
				const binaryData = await this.helpers.prepareBinaryData(stream, filePath);

				if (options.fileName !== undefined) {
					binaryData.fileName = options.fileName as string;
				}

				if (options.fileExtension !== undefined) {
					binaryData.fileExtension = options.fileExtension as string;
				}

				if (options.mimeType !== undefined) {
					binaryData.mimeType = options.mimeType as string;
				}

				newItems.push({
					binary: {
						[dataPropertyName]: binaryData,
					},
					json: {
						mimeType: binaryData.mimeType,
						fileType: binaryData.fileType,
						fileName: binaryData.fileName,
						fileExtension: binaryData.fileExtension,
						fileSize: binaryData.fileSize,
					},
					pairedItem: {
						item: itemIndex,
					},
				});
			}
			returnData.push(...newItems);
		} catch (error) {
			const nodeOperatioinError = errorMapper.call(this, error, itemIndex, {
				filePath: fileSelector,
				operation: 'read',
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
