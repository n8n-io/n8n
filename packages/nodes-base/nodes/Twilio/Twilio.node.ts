import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { escapeXml, twilioApiRequest } from './GenericFunctions';

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
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
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
				noDataExpression: true,
				options: [
					{
						name: 'Call',
						value: 'call',
					},
					{
						name: 'SMS',
						value: 'sms',
					},
				],
				default: 'sms',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['sms'],
					},
				},
				options: [
					{
						name: 'Send',
						value: 'send',
						description: 'Send SMS/MMS/WhatsApp message',
						action: 'Send an SMS/MMS/WhatsApp message',
					},
				],
				default: 'send',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['call'],
					},
				},
				options: [
					{
						name: 'Make',
						value: 'make',
						action: 'Make a call',
					},
				],
				default: 'make',
			},

			// ----------------------------------
			//         sms / call
			// ----------------------------------

			// ----------------------------------
			//         sms:send / call:make
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
						operation: ['send', 'make'],
						resource: ['sms', 'call'],
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
						operation: ['send', 'make'],
						resource: ['sms', 'call'],
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
						operation: ['send'],
						resource: ['sms'],
					},
				},
				description: 'Whether the message should be sent to WhatsApp',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['send'],
						resource: ['sms'],
					},
				},
				description: 'The message to send',
			},
			{
				displayName: 'Use TwiML',
				name: 'twiml',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						operation: ['make'],
						resource: ['call'],
					},
				},
				description:
					'Whether to use the <a href="https://www.twilio.com/docs/voice/twiml">Twilio Markup Language</a> in the message',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['make'],
						resource: ['call'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Status Callback',
						name: 'statusCallback',
						type: 'string',
						default: '',
						description:
							'Status Callbacks allow you to receive events related to the REST resources managed by Twilio: Rooms, Recordings and Compositions',
					},
				],
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

		let requestMethod: IHttpRequestMethods;
		let endpoint: string;

		for (let i = 0; i < items.length; i++) {
			try {
				requestMethod = 'GET';
				endpoint = '';
				body = {};
				qs = {};

				resource = this.getNodeParameter('resource', i);
				operation = this.getNodeParameter('operation', i);

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
						body.StatusCallback = this.getNodeParameter('options.statusCallback', i, '') as string;

						const toWhatsapp = this.getNodeParameter('toWhatsapp', i) as boolean;

						if (toWhatsapp) {
							body.From = `whatsapp:${body.From}`;
							body.To = `whatsapp:${body.To}`;
						}
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not known!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'call') {
					if (operation === 'make') {
						// ----------------------------------
						//         call:make
						// ----------------------------------

						requestMethod = 'POST';
						endpoint = '/Calls.json';

						const message = this.getNodeParameter('message', i) as string;
						const useTwiml = this.getNodeParameter('twiml', i) as boolean;
						body.From = this.getNodeParameter('from', i) as string;
						body.To = this.getNodeParameter('to', i) as string;

						if (useTwiml) {
							body.Twiml = message;
						} else {
							body.Twiml = `<Response><Say>${escapeXml(message)}</Say></Response>`;
						}

						body.StatusCallback = this.getNodeParameter('options.statusCallback', i, '') as string;
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not known!`,
							{ itemIndex: i },
						);
					}
				} else {
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`, {
						itemIndex: i,
					});
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
