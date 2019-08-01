import { IExecuteSingleFunctions } from 'n8n-core';
import {
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
} from 'n8n-workflow';
import { UriOptions } from 'request';


export class ReadFileFromUrl implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Read File From Url',
		name: 'readFileFromUrl',
		icon: 'fa:file-download',
		group: ['input'],
		version: 1,
		description: 'Reads a file from an URL',
		defaults: {
			name: 'Read File URL',
			color: '#119955',
		},
		inputs: ['main'],
		outputs: ['main'],
		changesIncomingData: {
			value: true,
			keys: 'binary',
		},
		properties: [
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'http://example.com/index.html',
				description: 'URL of the file to read.',
			},
			{
				displayName: 'Property Name',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				description: 'Name of the binary property to which to<br />write the data of the URL.',
			},
			{
				displayName: 'Ignore SSL Issues',
				name: 'allowUnauthorizedCerts',
				type: 'boolean',
				default: false,
				description: 'Still download the file even if SSL certificate validation is not possible.',
			},
		]
	};


	async executeSingle(this: IExecuteSingleFunctions): Promise<INodeExecutionData> {
		const url = this.getNodeParameter('url') as string;
		const dataPropertyName = this.getNodeParameter('dataPropertyName') as string;

		const options: UriOptions = {
			uri: url,
			// @ts-ignore
			encoding: null,
			rejectUnauthorized: !this.getNodeParameter('allowUnauthorizedCerts', false) as boolean,
		};

		// TODO: Should have a catch here
		const data = await this.helpers.request(options);

		// Get the filename and also add it to the binary data
		const fileName = (url).split('/').pop();

		// Get the current item and add the binary data
		const item = this.getInputData();

		if (!item.binary) {
			item.binary = {};
		}

		item.binary[dataPropertyName as string] = await this.helpers.prepareBinaryData(data, fileName);

		return item;
	}
}
