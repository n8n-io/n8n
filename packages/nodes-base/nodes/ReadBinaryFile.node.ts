import { IExecuteSingleFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	readFile as fsReadFile,
} from 'fs';
import { promisify } from 'util';

const fsReadFileAsync = promisify(fsReadFile);


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
				description: 'Name of the binary property to which to<br />write the data of the read file.',
			},
		],
	};


	async executeSingle(this: IExecuteSingleFunctions): Promise<INodeExecutionData> {
		const item = this.getInputData();

		const dataPropertyName = this.getNodeParameter('dataPropertyName') as string;
		const filePath = this.getNodeParameter('filePath') as string;

		let data;
		try {
			data = await fsReadFileAsync(filePath) as Buffer;
		} catch (error) {
			if (error.code === 'ENOENT') {
				throw new Error(`The file "${filePath}" could not be found.`);
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

		return newItem;
	}

}
