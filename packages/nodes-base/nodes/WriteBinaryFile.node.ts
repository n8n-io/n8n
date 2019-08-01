import {
	BINARY_ENCODING,
	IExecuteSingleFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
} from 'n8n-workflow';

import {
	writeFile as fsWriteFile,
} from 'fs';
import { promisify } from "util";

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
		changesIncomingData: {
			value: false,
		},
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
			return item;
		}

		if (item.binary[dataPropertyName] === undefined) {
			return item;
		}

		// Write the file to disk
		await fsWriteFileAsync(fileName, Buffer.from(item.binary[dataPropertyName].data, BINARY_ENCODING), 'binary');

		if (item.json === undefined) {
			item.json = {};
		}

		// Add the file name to data
		(item.json as IDataObject).fileName = fileName;

		return item;
	}
}
