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
	whatsappApiRequest,
} from './GenericFunctions';

export class WhatsApp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WhatsApp',
		name: 'whatsapp',
		icon: 'file:whatsapp.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Send WhatsApp messages as notification alerts',
		defaults: {
			name: 'WhatsApp',
			color: '#25D366',
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
						name: 'WhatsApp',
						value: 'whatsapp',
					},
				],
				default: 'whatsapp',
				description: 'The resource to operate on.',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'whatsapp',
						],
					},
				},
				options: [
					{
						name: 'Send Message',
						value: 'sendMessage',
						description: 'Send WhatsApp text message',
					},
					{
						name: 'Send File',
						value: 'sendFile',
						description: 'Send WhatsApp file-in message',
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
			//         whatsapp
			// ----------------------------------

			// ----------------------------------
			//         whatsapp:sendMessage
			// ----------------------------------
			{
				displayName: 'MessageTo',
				name: 'to',
				type: 'string',
				default: '',
				placeholder: '74155238886',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'sendMessage',
						],
						resource: [
							'whatsapp',
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
							'whatsapp',
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
				placeholder: '74155238886',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'sendFile',
						],
						resource: [
							'whatsapp',
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
							'whatsapp',
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
			requestMethod = 'GET';
			endpoint = '';
			body = {};
			qs = {};
			endpoint = '/send_message';
				
			resource = this.getNodeParameter('resource', i) as string;
			operation = this.getNodeParameter('operation', i) as string;
			body.channelId = this.getNodeParameter('channel', i) as string;
			body.chatId = this.getNodeParameter('to', i) as string;
			body.chatType = resource;				

			if (resource === 'whatsapp') {
				if (operation === 'sendMessage') {
					// ----------------------------------
					//         whatsapp:sendMessage
					// ----------------------------------

					requestMethod = 'POST';

					body.text = this.getNodeParameter('message', i) as string;

				} else if(operation === 'sendFile') {
					// ----------------------------------
					//         whatsapp:sendFile
					// ----------------------------------
					requestMethod = 'POST';

					body.content = this.getNodeParameter('content', i) as string;		

				} else {
					throw new Error(`The operation "${operation}" is not known!`);
				}
			} else {
				throw new Error(`The resource "${resource}" is not known!`);
			}

			const responseData = await whatsappApiRequest.call(this, requestMethod, endpoint, body, qs);

			returnData.push(responseData as IDataObject);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
