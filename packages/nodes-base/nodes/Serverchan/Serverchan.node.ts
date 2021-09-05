import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IBinaryData,
	IBinaryKeyData,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	serverchanApiRequest,
} from './GenericFunctions';

export class Serverchan implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ServerChan',
		name: 'serverchan',
		icon: 'file:serverchan.logo.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Serverchan API',
		defaults: {
			name: 'Serverchan',
			color: '#4b9cea',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'serverchan',
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
						name: 'Message',
						value: 'message',
					},
				],
				default: 'message',
				description: 'The resource to operate on.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'message',
						],
					},
				},
				options: [
					{
						name: 'Push',
						value: 'push',
					},
				],
				default: 'push',
				description: 'The resource to operate on.',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'message',
						],
						operation: [
							'push',
						],
					},
				},
				default: '',
				description: `Title`,
			},
			{
				displayName: 'Desp',
				name: 'desp',
				type: 'string',
				required: false,
				default: '',
				description: `Desp`,
				displayOptions: {
					show: {
						resource: [
							'message',
						],
						operation: [
							'push',
						],
					},
				},
			},


		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'message') {
					if (operation === 'push') {
						const title = this.getNodeParameter('title', i) as string;

						const desp = this.getNodeParameter('desp', i) as string;

						const body: IDataObject = {
							title,
							desp,
						};



						responseData = await serverchanApiRequest.call(
							this,
							'POST',
							body,
						);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		if (Array.isArray(responseData)) {
			returnData.push.apply(returnData, responseData as IDataObject[]);
		} else if (responseData !== undefined) {
			returnData.push(responseData as IDataObject);
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
