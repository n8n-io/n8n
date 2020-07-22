import { IExecuteFunctions } from 'n8n-core';
import { INodeExecutionData, IDataObject, INodeType, INodeTypeDescription, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { twakeApiRequest, unid, loadChannels } from './GenericFunctions';

export class Twake implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Twake',
		name: 'twake',
		group: ['transform'],
		version: 1,
		icon: 'file:twake.png',
		description: 'Twake node for n8n',
		defaults: {
			name: 'Twake',
			color: '#772244',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'twakeApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Application',
				name: 'application',
				type: 'options',
				options: [
					{
						name: 'Message',
						value: 'message',
						description: 'Send data to message app',
					},
				],
				default: 'message',
				description: 'The operation to perform.',
			},
			// messgage
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						application: ['message'],
					},
				},
				options: [
					{
						name: 'Send Message',
						value: 'sendMessage',
						description: 'Send message',
					},
				],
				default: 'sendMessage',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Channel',
				name: 'channelId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getChannels',
				},
				displayOptions: {
					show: {
						operation: ['sendMessage'],
					},
				},
				default: '',
				description: 'Channel name',
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['sendMessage'],
					},
				},
				default: '',
				description: 'Message content',
			},
			{
				displayName: 'Sender name',
				name: 'senderName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['sendMessage'],
					},
				},
				default: '',
				description: 'Sender name',
			},
			{
				displayName: 'Sender icon',
				name: 'senderIcon',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['sendMessage'],
					},
				},
				default: '',
				description: 'Sender icon',
			}
		],
	};

	methods = {
		loadOptions: {
			async getChannels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const endpoint = 'channel';
				const responseData = await twakeApiRequest.call(this, 'POST', endpoint, {});
				if (responseData === undefined) {
					throw new Error('No data got returned');
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

		let item: INodeExecutionData;

		const credentials = this.getCredentials('twakeApi');
		let body: IDataObject;
		let qs: IDataObject;
		let application: string;
		let requestMethod: string;
		let endpoint: string;

		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}

		// Itterates over all input items and add the key "myString" with the
		// value the parameter "myString" resolves to.
		// (This could be a different value for each item in case it contains an expression)
		for (let i = 0; i < items.length; i++) {
			requestMethod = 'POST';
			endpoint = '';
			body = {};
			qs = {};
			item = items[i];
			application = this.getNodeParameter('application', i) as string;
			let operation = this.getNodeParameter('operation', i) as string;
			if (application == 'message') {
				let message = {};
				if (operation == 'sendMessage') {
					endpoint = 'actions/message/save';
					message = {
						channel_id: this.getNodeParameter('channelId', i),
						content: {
							formatted: this.getNodeParameter('content', i) as string,
						},
						hidden_data: {
							allow_delete: 'everyone',
							custom_icon: this.getNodeParameter('senderIcon', i) as string,
							custom_title: this.getNodeParameter('senderName', i) as string,
						},
					};
					body = {
						object: message,
					};
				}
			}
			let route = endpoint;
			const responseData = await twakeApiRequest.call(this, 'POST', endpoint, body);

			if (!responseData.object) {
				throw new Error('error: ' + JSON.stringify(responseData));
			}
		}

		return this.prepareOutputData(items);
	}
}
