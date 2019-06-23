import {
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
} from 'n8n-workflow';

import {
	twilioApiRequest,
} from './GenericFunctions';

import { OptionsWithUri } from 'request';

export class Twilio implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Twilio',
		name: 'twilio',
		icon: 'file:twilio.png',
		group: ['transform'],
		version: 1,
		description: 'Send SMS and WhatsApp messages or make phone calls',
		defaults: {
			name: 'Twilio',
			color: '#cf272d',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'twilioApi',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Send Message',
						value: 'sendMessage',
						description: 'Send SMS/MMS/WhatsApp message',
					},
				],
				default: 'sendMessage',
				description: 'The operation to perform.',
			},


			// ----------------------------------
			//         sendMessage
			// ----------------------------------
			{
				displayName: 'From',
				name: 'from',
				type: 'string',
				default: '',
				placeholder: '+14155238886',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'sendMessage',
						],
					},
				},
				description: 'The number from which to send the message',
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'string',
				default: '',
				placeholder: '+14155238886',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'sendMessage',
						],
					},
				},
				description: 'The number to which to send the message',
			},
			{
				displayName: 'To Whatsapp',
				name: 'toWhatsapp',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						operation: [
							'sendMessage',
						],
					},
				},
				description: 'If the message should be send to WhatsApp',
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
					},
				},
				description: 'The message to send',
			},
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const operation = this.getNodeParameter('operation', 0) as string;

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

			if (operation === 'sendMessage') {
				// ----------------------------------
				//         sendMessage
				// ----------------------------------

				requestMethod = 'POST';
				endpoint = '/Messages.json';

				body.From = this.getNodeParameter('from', i) as string;
				body.To = this.getNodeParameter('to', i) as string;
				body.Body = this.getNodeParameter('message', i) as string;

				const toWhatsapp = this.getNodeParameter('toWhatsapp', i) as boolean;

				if (toWhatsapp === true) {
					body.From = `whatsapp:${body.From}`;
					body.To = `whatsapp:${body.To}`;
				}
			} else {
				throw new Error(`The operation "${operation}" is not known!`);
			}

			const responseData = await twilioApiRequest.call(this, requestMethod, endpoint, body, qs);

			returnData.push(responseData as IDataObject);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
