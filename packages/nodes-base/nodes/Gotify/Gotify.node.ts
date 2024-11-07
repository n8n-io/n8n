import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeTypeDescription,
} from 'n8n-workflow';
import { Node, NodeConnectionType } from 'n8n-workflow';

import { gotifyApiRequest, gotifyApiRequestAllItems } from './GenericFunctions';

export class Gotify extends Node {
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
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
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
						name: 'Get Many',
						value: 'getAll',
						action: 'Get many messages',
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
				description: 'The message to send, If using Markdown add the Content Type option',
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
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['create'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Content Type',
						name: 'contentType',
						type: 'options',
						default: 'text/plain',
						description: 'The message content type',
						options: [
							{
								name: 'Plain',
								value: 'text/plain',
							},
							{
								name: 'Markdown',
								value: 'text/markdown',
							},
						],
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

	async execute(context: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = context.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const qs: IDataObject = {};
		let responseData;
		const resource = context.getNodeParameter('resource', 0);
		const operation = context.getNodeParameter('operation', 0);
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'message') {
					if (operation === 'create') {
						const message = context.getNodeParameter('message', i) as string;

						const additionalFields = context.getNodeParameter('additionalFields', i);
						const options = context.getNodeParameter('options', i);

						const body: IDataObject = {
							message,
						};

						if (options.contentType) {
							body.extras = {
								'client::display': {
									contentType: options.contentType,
								},
							};
						}

						Object.assign(body, additionalFields);

						responseData = await gotifyApiRequest(context, 'POST', '/message', body);

						responseData = await gotifyApiRequest(context, 'POST', '/message', body);
					}
					if (operation === 'delete') {
						const messageId = context.getNodeParameter('messageId', i) as string;

						responseData = await gotifyApiRequest(context, 'DELETE', `/message/${messageId}`);
						responseData = { success: true };
					}

					if (operation === 'getAll') {
						const returnAll = context.getNodeParameter('returnAll', i);

						if (returnAll) {
							responseData = await gotifyApiRequestAllItems(
								context,
								'messages',
								'GET',
								'/message',
								{},
								qs,
							);
						} else {
							qs.limit = context.getNodeParameter('limit', i);
							responseData = await gotifyApiRequest(context, 'GET', '/message', {}, qs);
							responseData = responseData.messages;
						}
					}
				}

				const executionData = context.helpers.constructExecutionMetaData(
					context.helpers.returnJsonArray(responseData as IDataObject[]),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (context.continueOnFail()) {
					returnData.push({ json: { error: error.message } });
					continue;
				}
				throw error;
			}
		}
		return [returnData];
	}
}
