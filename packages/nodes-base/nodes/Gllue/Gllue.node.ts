import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';
import {clientFields, clientOperations} from './ClientDescription';
import {UrlParams} from './helpers';

const helpers = require('./helpers');


export class Gllue implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Gllue',
		name: 'gllue',
		icon: 'file:gllue.svg',
		group: ['transform'],
		version: 1,
		description: 'Consume Gllue API',
		defaults: {
			name: 'Gllue',
			color: '#1A82e2',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'gllueApi',
				required: true,
			},

		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Client',
						value: 'client',
					},
				],
				default: 'client',
				required: true,
				description: 'Resource to client',
			},
			...clientOperations,
			...clientFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		// tslint:disable-next-line:no-any
		const filters = this.getNodeParameter('filters', 0) as any;
		// tslint:disable-next-line:no-debugger
		debugger;
		const credentials = await this.getCredentials('gllueApi') as IDataObject;

		const timestamp = helpers.getCurrentTimeStamp();
		const token = helpers.generateTokenWithAESKey(timestamp, credentials.apiUsername, credentials.apiAesKey);
		const urlParams = new UrlParams(filters.query, filters.fields);
		const uriGenerated = helpers.gllueUrlBuilder(credentials.apiHost, resource, operation, urlParams);

		if (resource === 'client') {
			if (operation === 'simple_list_with_ids') {
				const options: OptionsWithUri = {
					headers: {
						'Accept': 'application/json',
					},
					method: 'GET',
					uri: uriGenerated,
					json: true,
				};
				console.log(`request with ${options.uri}`);
				responseData = await this.helpers.request(options);
			}
		}
		return [this.helpers.returnJsonArray(responseData)];
	}
}
