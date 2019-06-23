import { IExecuteSingleFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeTypeDescription,
	INodeType,
} from 'n8n-workflow';

import { promises as fs } from 'fs';


export class ReadBinaryFile implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Read Binary File',
		name: 'readBinaryFile',
		group: ['input'],
		version: 1,
		description: 'Reads a binary file from disk',
		defaults: {
			name: 'Read Binary File',
			color: '#22CC33',
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
		]
	};


	async executeSingle(this: IExecuteSingleFunctions): Promise<INodeExecutionData> {
		const item = this.getInputData();

		const dataPropertyName = this.getNodeParameter('dataPropertyName') as string;
		const filePath = this.getNodeParameter('filePath') as string;

		if (item.binary === undefined) {
			item.binary = {};
		}

		let data;
		try {
			data = await fs.readFile(filePath) as Buffer;
		} catch (error) {
			if (error.code === 'ENOENT') {
				throw new Error(`The file "${filePath}" could not be found.`);
			}

			throw error;
		}
		item.binary[dataPropertyName] = await this.helpers.prepareBinaryData(data, filePath);

		return item;
	}

}
