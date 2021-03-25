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
	instagramApiRequest,
} from './GenericFunctions';

export class Instagram implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Instagram',
		name: 'instagram',
		icon: 'file:instagram.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Send Instagram messages as notification alerts',
		defaults: {
			name: 'Instagram',
			color: '#E4405F',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'wazzupApi',
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
						name: 'Instagram',
						value: 'instagram',
					},
				],
				default: 'instagram',
				description: 'The resource to operate on.',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'instagram',
						],
					},
				},
				options: [
					{
						name: 'Send Message',
						value: 'sendMessage',
						description: 'Send Instagram text message',
					},
					{
						name: 'Send File',
						value: 'sendFile',
						description: 'Send Instagram file-in message',
					},					
				],
				default: 'sendMessage',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Channel ID',
				name: 'channel',
				type: 'string',
				default: '',
				required: true,
				description: 'This is API`s required field',
			},

			// ----------------------------------
			//         instagram
			// ----------------------------------

			// ----------------------------------
			//         instagram:sendMessage
			// ----------------------------------
			{
				displayName: 'MessageTo',
				name: 'to',
				type: 'string',
				default: '',
				placeholder: 'justinbieber',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'sendMessage',
						],
						resource: [
							'instagram',
						],
					},
				},
				description: 'The number to which to send the message',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'sendMessage',
						],
						resource: [
							'instagram',
						],
					},
				},
				description: 'The message to send',
			},

			{
				displayName: 'MessageTo',
				name: 'to',
				type: 'string',
				default: '',
				placeholder: 'justinbieber',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'sendFile',
						],
						resource: [
							'instagram',
						],
					},
				},
				description: 'The number to which to send the message',
			},
			{
				displayName: 'File link',
				name: 'content',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'sendFile',
						],
						resource: [
							'instagram',
						],
					},
				},
				description: 'The message to send',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		let operation: string;
		let resource: string;

		// For Post
		let body: IDataObject;
		// For Query string
		let qs: IDataObject;

		let requestMethod: string;
		let endpoint: string;

		for (let i = 0; i < items.length; i++) {
			requestMethod = 'POST';
			endpoint = '';
			body = {};
			qs = {};
			endpoint = '/send_message';
				
			resource = this.getNodeParameter('resource', i) as string;
			operation = this.getNodeParameter('operation', i) as string;
			body.channelId = this.getNodeParameter('channel', i) as string;
			body.chatId = this.getNodeParameter('to', i) as string;
			body.chatType = resource;				

			if (resource === 'instagram') {
				if (operation === 'sendMessage') {
					// ----------------------------------
					//         whatsapp:sendMessage
					// ----------------------------------
					body.text = this.getNodeParameter('message', i) as string;

				} else if(operation === 'sendFile') {
					// ----------------------------------
					//         whatsapp:sendFile
					// ----------------------------------
					body.content = this.getNodeParameter('content', i) as string;		

				} else {
					throw new Error(`The operation "${operation}" is not known!`);
				}
			} else {
				throw new Error(`The resource "${resource}" is not known!`);
			}

			const responseData = await instagramApiRequest.call(this, requestMethod, endpoint, body, qs);

			returnData.push(responseData as IDataObject);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
