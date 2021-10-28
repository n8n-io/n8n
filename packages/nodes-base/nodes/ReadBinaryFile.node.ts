import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	readFile as fsReadFile,
} from 'fs/promises';


export class ReadBinaryFile implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Read Binary File',
		name: 'readBinaryFile',
		icon: 'fa:file-import',
		group: ['input'],
		version: 1,
		description: 'Reads a binary file from disk',
		defaults: {
			name: 'Read Binary File',
			color: '#449922',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'File Path',
				name: 'filePath',
				type: 'string',
				default: '',
				required: true,
				placeholder: '/data/example.jpg',
				description: 'Path of the file to read.',
			},
			{
				displayName: 'Property Name',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Name of the binary property to which to write the data of the read file.',
			},
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];
		const length = items.length as unknown as number;
		let item: INodeExecutionData;

		for (let itemIndex = 0; itemIndex < length; itemIndex++) {

			try {

				item = items[itemIndex];
				const dataPropertyName = this.getNodeParameter('dataPropertyName', itemIndex) as string;
				const filePath = this.getNodeParameter('filePath', itemIndex) as string;

				let data;
				try {
					data = await fsReadFile(filePath) as Buffer;
				} catch (error) {
					if (error.code === 'ENOENT') {
						throw new NodeOperationError(this.getNode(), `The file "${filePath}" could not be found.`);
					}

					throw error;
				}

				const newItem: INodeExecutionData = {
					json: item.json,
					binary: {},
				};

				if (item.binary !== undefined) {
					// Create a shallow copy of the binary data so that the old
					// data references which do not get changed still stay behind
					// but the incoming data does not get changed.
					Object.assign(newItem.binary, item.binary);
				}

				newItem.binary![dataPropertyName] = await this.helpers.prepareBinaryData(data, filePath);
				returnData.push(newItem);

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({json:{ error: error.message }});
					continue;
				}
				throw error;
			}
		}

		return this.prepareOutputData(returnData);
	}

}
