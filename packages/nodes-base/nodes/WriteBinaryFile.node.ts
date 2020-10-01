import {
	BINARY_ENCODING,
	IExecuteSingleFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	writeFile as fsWriteFile,
} from 'fs';
import { promisify } from 'util';

const fsWriteFileAsync = promisify(fsWriteFile);


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
				description: 'Path to which the file should be written.',
			},
			{
				displayName: 'Property Name',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Name of the binary property which contains<br />the data for the file to be written.',
			},
		]
	};


	async executeSingle(this: IExecuteSingleFunctions): Promise<INodeExecutionData> {
		const item = this.getInputData();

		const dataPropertyName = this.getNodeParameter('dataPropertyName') as string;
		const fileName = this.getNodeParameter('fileName') as string;

		if (item.binary === undefined) {
			throw new Error('No binary data set. So file can not be written!');
		}

		if (item.binary[dataPropertyName] === undefined) {
			throw new Error(`The binary property "${dataPropertyName}" does not exist. So no file can be written!`);
		}

		// Write the file to disk
		await fsWriteFileAsync(fileName, Buffer.from(item.binary[dataPropertyName].data, BINARY_ENCODING), 'binary');

		const newItem: INodeExecutionData = {
			json: {},
		};
		Object.assign(newItem.json, item.json);

		if (item.binary !== undefined) {
			// Create a shallow copy of the binary data so that the old
			// data references which do not get changed still stay behind
			// but the incoming data does not get changed.
			newItem.binary = {};
			Object.assign(newItem.binary, item.binary);
		}

		// Add the file name to data
		(newItem.json as IDataObject).fileName = fileName;

		return newItem;
	}
}
