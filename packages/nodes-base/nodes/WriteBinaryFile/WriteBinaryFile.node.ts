import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { BINARY_ENCODING } from 'n8n-workflow';

import { writeFile as fsWriteFile } from 'fs/promises';
import type { Readable } from 'stream';

export class WriteBinaryFile implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Write Binary File',
		name: 'writeBinaryFile',
		icon: 'fa:file-export',
		group: ['output'],
		version: 1,
		description: 'Writes a binary file to disk',
		defaults: {
			name: 'Write Binary File',
			color: '#CC2233',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				required: true,
				placeholder: '/data/example.jpg',
				description: 'Path to which the file should be written',
			},
			{
				displayName: 'Property Name',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description:
					'Name of the binary property which contains the data for the file to be written',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Append',
						name: 'append',
						type: 'boolean',
						default: false,
						description: 'Whether to append to an existing file',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		let item: INodeExecutionData;

		for (let itemIndex = 0; itemIndex < length; itemIndex++) {
			try {
				const dataPropertyName = this.getNodeParameter('dataPropertyName', itemIndex);

				const fileName = this.getNodeParameter('fileName', itemIndex) as string;
				const options = this.getNodeParameter('options', 0, {});

				const flag = options.append ? 'a' : 'w';

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
					fileContent = this.helpers.getBinaryStream(binaryData.id);
				} else {
					fileContent = Buffer.from(binaryData.data, BINARY_ENCODING);
				}

				// Write the file to disk
				await fsWriteFile(fileName, fileContent, { encoding: 'binary', flag });

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
				throw error;
			}
		}
		return this.prepareOutputData(returnData);
	}
}
