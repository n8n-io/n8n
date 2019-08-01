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

		newItem.binary![dataPropertyName as string] = await this.helpers.prepareBinaryData(data, fileName);

		return newItem;
	}
}
