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
						name: 'Send',
						value: 'send',
						description: 'Send WhatsApp message',
					},
				],
				default: 'send',
				description: 'The operation to perform.',
			},


			// ----------------------------------
			//         whatsapp
			// ----------------------------------

			// ----------------------------------
			//         whatsapp:send
			// ----------------------------------
			{
				displayName: 'MessageTo',
				name: 'to',
				type: 'string',
				default: '',
				placeholder: '+14155238886',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'send',
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
							'send',
						],
						resource: [
							'whatsapp',
						],
					},
				},
				description: 'The message to send',
			},
			{
				displayName: 'File Link',
				name: 'content',
				type: 'string',
				default: '',
				required: false,
				displayOptions: {
					show: {
						operation: [
							'send',
						],
						resource: [
							'whatsapp',
						],
					},
				},
				description: 'The file/image link to send',
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

			resource = this.getNodeParameter('resource', i) as string;
			operation = this.getNodeParameter('operation', i) as string;

			if (resource === 'whatsapp') {
				if (operation === 'send') {
					// ----------------------------------
					//         sms:send
					// ----------------------------------

					requestMethod = 'POST';
					endpoint = '/send_message';

					body.chatId = this.getNodeParameter('to', i) as string;
					body.text = this.getNodeParameter('message', i) as string;
					// body.content = this.getNodeParameter('content', i) as string;
					body.chatType = 'whatsapp';
					body.channelId = '8927c7db-1482-4b06-b40e-7e7840792c1a';

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
