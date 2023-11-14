import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { BINARY_ENCODING } from 'n8n-workflow';

import type { Readable } from 'stream';
import glob from 'fast-glob';

const displayOnRead = {
	show: {
		operation: ['read'],
	},
};

const displayOnWrite = {
	show: {
		operation: ['write'],
	},
};

export class ReadWriteFile implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Read/Write Files from Disk',
		name: 'readWriteFile',
		icon: 'fa:file',
		group: ['input'],
		version: 1,
		description: 'Read or write files from the computer that runs n8n',
		defaults: {
			name: 'Read/Write Files from Disk',
			color: '#999999',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName:
					'Use this node to read and write files on the same computer running n8n. To handle files between different computers please use other nodes (e.g. FTP, HTTP Request, AWS).',
				name: 'info',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'hidden',
				noDataExpression: true,
				options: [
					{
						name: 'File',
						value: 'file',
					},
				],
				default: 'file',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['file'],
					},
				},
				options: [
					{
						name: 'Read File(s) From Disk',
						value: 'read',
						description: 'Retrieve one or more binary files from the computer that runs n8n',
						action: 'Read File(s) From Disk',
					},
					{
						name: 'Write File to Disk',
						value: 'write',
						description: 'Create a binary file on the computer that runs n8n',
						action: 'Write File to Disk',
					},
				],
				default: 'read',
			},

			{
				displayName: 'File(s) Selector',
				name: 'fileSelector',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. /home/user/Pictures/**/*.png',
				hint: 'Supports patterns, learn more <a href="https://github.com/micromatch/picomatch#basic-globbing" target="_blank">here</a>',
				description: "Specify a file's path or path pattern to read multiple files",
				displayOptions: displayOnRead,
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: displayOnRead,
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
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. /data/example.jpg',
				description: 'Path to which the file should be written',
				displayOptions: displayOnWrite,
			},
			{
				displayName: 'File Property',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description:
					'Name of the binary property which contains the data for the file to be written',
				displayOptions: displayOnWrite,
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: displayOnWrite,
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

	async execute(this: IExecuteFunctions) {
		const operation = this.getNodeParameter('operation', 0, 'read');
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		if (operation === 'read') {
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
								error: (error as Error).message,
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
		}

		if (operation === 'write') {
			let item: INodeExecutionData;
			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				try {
					const dataPropertyName = this.getNodeParameter('dataPropertyName', itemIndex);
					const fileName = this.getNodeParameter('fileName', itemIndex) as string;
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
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: (error as Error).message,
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
		}

		return [returnData];
	}
}
