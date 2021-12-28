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
					{
						name: 'Contract',
						value: 'contract',
					},
				],
				default: 'client',
				required: true,
				description: 'Resource to consume',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'client',
						],
					},
				},
				options: [
					{
						name: 'list',
						value: 'list',
						description: 'List clients',
					},
				],
				default: 'list',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'contract',
						],
					},
				},
				options: [
					{
						name: 'delete',
						value: 'delete',
						description: 'Delete contract',
					},
				],
				default: 'delete',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Contract ID',
				name: 'id',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'delete',
						],
						resource: [
							'contract',
						],
					},
				},
				default:'',
				description:'Contract ID',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let responseData;
		const items = this.getInputData();
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const credentials = await this.getCredentials('gllueApi') as IDataObject;

		const timestamp = helpers.getCurrentTimeStamp();
		const token = helpers.generateTokenWithAESKey(timestamp, credentials.apiUsername, credentials.apiAesKey);

		if (resource === 'client') {
			if (operation === 'list') {
				const options: OptionsWithUri = {
					headers: {
						'Accept': 'application/json',
					},
					method: 'GET',
					uri: `${credentials.apiHost}/rest/client/simple_list_with_ids?paginate_by=25&ordering=-id&gql=&page=1&fields='id'&private_token=${token}`,
					json: true,
				};

				responseData = await this.helpers.request(options);
			}
		} else if (resource == 'contract'){
			if (operation === 'delete'){
				const api_path = '/rest/clientcontract/delete';
				const contract_ids = items.map(
					(item, index) => this.getNodeParameter('id', index)
				);
				const body = { ids: contract_ids, count: contract_ids.length };
				responseData = await helpers.gllueApiRequest.call(this, 'POST', api_path,{}, body, credentials);
			}
		}
		return [this.helpers.returnJsonArray(responseData)];
	}
}
