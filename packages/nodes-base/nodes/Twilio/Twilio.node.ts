import {
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	twilioApiRequest,
} from './GenericFunctions';

export class Twilio implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Twilio',
		name: 'twilio',
		icon: 'file:twilio.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
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
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'SMS',
						value: 'sms',
					},
				],
				default: 'sms',
				description: 'The resource to operate on.',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'sms',
						],
					},
				},
				options: [
					{
						name: 'Send',
						value: 'send',
						description: 'Send SMS/MMS/WhatsApp message',
					},
				],
				default: 'send',
				description: 'The operation to perform.',
			},


			// ----------------------------------
			//         sms
			// ----------------------------------

			// ----------------------------------
			//         sms:send
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
							'send',
						],
						resource: [
							'sms',
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
							'send',
						],
						resource: [
							'sms',
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
							'send',
						],
						resource: [
							'sms',
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
							'send',
						],
						resource: [
							'sms',
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
			try {
				requestMethod = 'GET';
				endpoint = '';
				body = {};
				qs = {};

				resource = this.getNodeParameter('resource', i) as string;
				operation = this.getNodeParameter('operation', i) as string;

				if (resource === 'sms') {
					if (operation === 'send') {
						// ----------------------------------
						//         sms:send
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
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`);
					}
				} else {
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`);
				}

				const responseData = await twilioApiRequest.call(this, requestMethod, endpoint, body, qs);

				returnData.push(responseData as IDataObject);
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
