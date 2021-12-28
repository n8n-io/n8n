import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	twakeApiRequest,
} from './GenericFunctions';

export class Twake implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Twake',
		name: 'twake',
		group: ['transform'],
		version: 1,
		icon: 'file:twake.png',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Twake API',
		defaults: {
			name: 'Twake',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'twakeCloudApi',
				required: true,
				// displayOptions: {
				// 	show: {
				// 		twakeVersion: [
				// 			'cloud',
				// 		],
				// 	},
				// },
			},
			// {
			// 	name: 'twakeServerApi',
			// 	required: true,
			// 	displayOptions: {
			// 		show: {
			// 			twakeVersion: [
			// 				'server',
			// 			],
			// 		},
			// 	},
			// },
		],
		properties: [
			// {
			// 	displayName: 'Twake Version',
			// 	name: 'twakeVersion',
			// 	type: 'options',
			// 	options: [
			// 		{
			// 			name: 'Cloud',
			// 			value: 'cloud',
			// 		},
			// 		{
			// 			name: 'Server (Self Hosted)',
			// 			value: 'server',
			// 		},
			// 	],
			// 	default: 'cloud',
			// },
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Message',
						value: 'message',
						description: 'Send data to the message app',
					},
				],
				default: 'message',
				description: 'The operation to perform.',
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
						name: 'Send',
						value: 'send',
						description: 'Send a message',
					},
				],
				default: 'send',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Channel ID',
				name: 'channelId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getChannels',
				},
				displayOptions: {
					show: {
						operation: [
							'send',
						],
					},
				},
				default: '',
				description: `Channel's ID`,
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'send',
						],
					},
				},
				default: '',
				description: 'Message content',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'send',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Sender Icon',
						name: 'senderIcon',
						type: 'string',
						default: '',
						description: 'URL of the image/icon',
					},
					{
						displayName: 'Sender Name',
						name: 'senderName',
						type: 'string',
						default: '',
						description: 'Sender name',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getChannels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const responseData = await twakeApiRequest.call(this, 'POST', '/channel', {});
				if (responseData === undefined) {
					throw new NodeOperationError(this.getNode(), 'No data got returned');
				}

				const returnData: INodePropertyOptions[] = [];
				for (const channel of responseData) {
					returnData.push({
						name: channel.name,
						value: channel.id,
					});
				}
				return returnData;
			},
		},
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
			if (resource === 'message') {
				if (operation === 'send') {

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					const message: IDataObject = {
						channel_id: this.getNodeParameter('channelId', i),
						content: {
							formatted: this.getNodeParameter('content', i) as string,
						},
						hidden_data: {
							allow_delete: 'everyone',
						},
					};

					if (additionalFields.senderName) {
						//@ts-ignore
						message.hidden_data!.custom_title = additionalFields.senderName as string;
					}

					if (additionalFields.senderIcon) {
						//@ts-ignore
						message.hidden_data!.custom_icon = additionalFields.senderIcon as string;
					}

					const body = {
						object: message,
					};

					const endpoint = '/actions/message/save';

					responseData = await twakeApiRequest.call(this, 'POST', endpoint, body);

					responseData = responseData.object;
				}
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
