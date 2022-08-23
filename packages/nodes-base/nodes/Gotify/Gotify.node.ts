import { IExecuteFunctions } from 'n8n-core';

import { IDataObject, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';

import { gotifyApiRequest, gotifyApiRequestAllItems } from './GenericFunctions';

export class Gotify implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Gotify',
		name: 'gotify',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:gotify.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Gotify API',
		defaults: {
			name: 'Gotify',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'gotifyApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Message',
						value: 'message',
					},
				],
				default: 'message',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['message'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						action: 'Create a message',
					},
					{
						name: 'Delete',
						value: 'delete',
						action: 'Delete a message',
					},
					{
						name: 'Get All',
						value: 'getAll',
						action: 'Get all messages',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['create'],
					},
				},
				default: '',
				description: 'The message. Markdown (excluding html) is allowed.',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['create'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Priority',
						name: 'priority',
						type: 'number',
						default: 1,
						description: 'The priority of the message',
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						description: 'The title of the message',
					},
				],
			},
			{
				displayName: 'Message ID',
				name: 'messageId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['delete'],
					},
				},
				default: '',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['getAll'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				description: 'Max number of results to return',
				default: 20,
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['getAll'],
						returnAll: [false],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'message') {
					if (operation === 'create') {
						const message = this.getNodeParameter('message', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {
							message,
						};

						Object.assign(body, additionalFields);

						responseData = await gotifyApiRequest.call(this, 'POST', `/message`, body);
					}
					if (operation === 'delete') {
						const messageId = this.getNodeParameter('messageId', i) as string;

						responseData = await gotifyApiRequest.call(this, 'DELETE', `/message/${messageId}`);
						responseData = { success: true };
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (returnAll) {
							responseData = await gotifyApiRequestAllItems.call(
								this,
								'messages',
								'GET',
								'/message',
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', i) as number;
							responseData = await gotifyApiRequest.call(this, 'GET', `/message`, {}, qs);
							responseData = responseData.messages;
						}
					}
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else if (responseData !== undefined) {
					returnData.push(responseData as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
