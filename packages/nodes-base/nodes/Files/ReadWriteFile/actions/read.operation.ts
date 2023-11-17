import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import glob from 'fast-glob';

export const properties: INodeProperties[] = [
	{
		displayName: 'File(s) Selector',
		name: 'fileSelector',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. /home/user/Pictures/**/*.png',
		hint: 'Supports patterns, learn more <a href="https://github.com/micromatch/picomatch#basic-globbing" target="_blank">here</a>',
		description: "Specify a file's path or path pattern to read multiple files",
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'File Property',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				description: 'Name of the binary property to which to write the data of the read files',
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

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		try {
			const fileSelector = this.getNodeParameter('fileSelector', itemIndex) as string;
			const dataPropertyName = this.getNodeParameter(
				'options.dataPropertyName',
				itemIndex,
				'data',
			) as string;

			const files = await glob(fileSelector);

			const newItems: INodeExecutionData[] = [];
			for (const filePath of files) {
				const stream = await this.helpers.createReadStream(filePath);
				const binaryData = await this.helpers.prepareBinaryData(stream, filePath);
				newItems.push({
					binary: {
						[dataPropertyName]: binaryData,
					},
					json: {
						mimeType: binaryData.mimeType,
						fileType: binaryData.fileType,
						fileName: binaryData.fileName,
						directory: binaryData.directory,
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
