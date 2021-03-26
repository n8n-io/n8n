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
	wazzupApiRequest,
} from './GenericFunctions';

export class Wazzup implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Wazzup',
		name: 'wazzup',
		icon: 'file:wazzup.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Send WhatsApp and Instagram messages as notification alerts',
		defaults: {
			name: 'Wazzup',
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
					{
						name: 'Instagram',
						value: 'instagram',
					},	
					{
						name: 'ВКонтакте',
						value: 'vk',
					},											
					{
						name: 'Channels',
						value: 'channels',
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
							'whatsapp', 'instagram', 'vk'
						],
					},
				},
				options: [
					{
						name: 'Send Message',
						value: 'sendMessage',
						description: 'Send Wazzup text message',
					},
					{
						name: 'Send File',
						value: 'sendFile',
						description: 'Send Wazzup file-in message',
					},					
				],
				default: 'sendMessage',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Channel ID',
				name: 'channel',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'whatsapp', 'instagram'
						],
					},
				},				
				default: '',
				required: true,
				description: 'This is API`s required field',
			},


			// ----------------------------------
			//         wazzup
			// ----------------------------------

			// ----------------------------------
			//         wazzup:sendMessage
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
							'whatsapp'
						],
					},
				},
				description: 'The number to which to send the message',
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
							'sendMessage',
						],
						resource: [
							'instagram'
						],
					},
				},
				description: 'The recepient ID to send the message',
			},
			{
				displayName: 'MessageTo',
				name: 'to',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'sendMessage',
						],
						resource: [
							'vk'
						],
					},
				},
				description: 'The recepient ID to send the message',
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
							'whatsapp', 'instagram', 'vk'
						],
					},
				},
				description: 'The message to send',
			},


			// ----------------------------------
			//         wazzup:sendFile
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
				description: 'The recepient ID to send the message',
			},		
			{
				displayName: 'MessageTo',
				name: 'to',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'sendFile',
						],
						resource: [
							'vk'
						],
					},
				},
				description: 'The recepient ID to send the message',
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
							'whatsapp', 'instagram', 'vk'
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
				
			resource = this.getNodeParameter('resource', i) as string;		

			if (resource === 'whatsapp' || resource === 'instagram' || resource === 'vk') {

				operation = this.getNodeParameter('operation', i) as string;
				body.channelId = this.getNodeParameter('channel', i) as string;
				body.chatId = this.getNodeParameter('to', i) as string;
				body.chatType = resource;		
				endpoint = '/send_message';
				requestMethod = 'POST';

				if (operation === 'sendMessage') {
					// ----------------------------------
					//         wazzup:sendMessage
					// ----------------------------------

					body.text = this.getNodeParameter('message', i) as string;

				} else if(operation === 'sendFile') {
					// ----------------------------------
					//         wazzup:sendFile
					// ----------------------------------

					body.content = this.getNodeParameter('content', i) as string;		

				} else {
					throw new Error(`The operation "${operation}" is not known!`);
				}
			} else if (resource === 'channels') {
					// ----------------------------------
					//         wazzup:channels
					// ----------------------------------

					endpoint = '/channels';
			}
			 else {
				throw new Error(`The resource "${resource}" is not known!`);
			}

			const responseData = await wazzupApiRequest.call(this, requestMethod, endpoint, body, qs);

			returnData.push(responseData as IDataObject);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
