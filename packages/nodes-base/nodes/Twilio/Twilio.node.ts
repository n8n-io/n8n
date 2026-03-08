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
				displayOptions: {
					show: {
						operation: ['send', 'make'],
						resource: ['sms', 'call'],
					},
				},
				description:
					'The number from which to send the message. Required unless using a Messaging Service SID.',
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
				displayName: 'Messaging Type',
				name: 'messagingType',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['send'],
						resource: ['sms'],
						toWhatsapp: [true],
					},
				},
				options: [
					{
						name: 'Text',
						value: 'text',
					},
					{
						name: 'Template',
						value: 'template',
					},
				],
				default: 'text',
			},
			{
				displayName: 'Content SID',
				name: 'contentSid',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['send'],
						resource: ['sms'],
						toWhatsapp: [true],
						messagingType: ['template'],
					},
				},
				description: 'The SID of the Content API template to use (starts with HX...)',
			},
			{
				displayName: 'Content Variables',
				name: 'contentVariables',
				type: 'json',
				default: '{}',
				displayOptions: {
					show: {
						operation: ['send'],
						resource: ['sms'],
						toWhatsapp: [true],
						messagingType: ['template'],
					},
				},
				description:
					'Key-value pairs corresponding to variables in the template as a JSON object (e.g., {"1": "John"})',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['send'],
						resource: ['sms'],
						toWhatsapp: [false],
					},
				},
				description: 'The message to send',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['send'],
						resource: ['sms'],
						toWhatsapp: [true],
						messagingType: ['text'],
					},
				},
				description: 'The message to send',
			},
			{
				displayName: 'Media URL',
				name: 'mediaUrl',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['send'],
						resource: ['sms'],
					},
					hide: {
						messagingType: ['template'],
					},
				},
				description:
					'The URL of the media you want to send. For WhatsApp templates, do not use this field; instead, include the media URL in the "Content Variables" JSON object.',
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
						displayName: 'Messaging Service SID',
						name: 'messagingServiceSid',
						type: 'string',
						default: '',
						displayOptions: {
							show: {
								'/operation': ['send'],
								'/resource': ['sms'],
							},
						},
						description: 'The SID of the Messaging Service you want to associate with the Message',
					},
					{
						displayName: 'Record',
						name: 'record',
						type: 'boolean',
						default: false,
						displayOptions: {
							show: {
								'/operation': ['make'],
								'/resource': ['call'],
							},
						},
						description: 'Whether to record the call',
					},
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

						const options = this.getNodeParameter('options', i, {});

						if (options.messagingServiceSid) {
							body.MessagingServiceSid = options.messagingServiceSid as string;
						} else {
							body.From = this.getNodeParameter('from', i, '') as string;
						}

						body.To = this.getNodeParameter('to', i) as string;
						body.StatusCallback = (options.statusCallback as string) || '';

						const toWhatsapp = this.getNodeParameter('toWhatsapp', i, false) as boolean;
						const messagingType = toWhatsapp
							? (this.getNodeParameter('messagingType', i, 'text') as string)
							: 'text';
						const mediaUrl = this.getNodeParameter('mediaUrl', i, '') as string;

						if (mediaUrl) {
							if (toWhatsapp) {
								body.MediaUrl = mediaUrl.split(',')[0].trim();
							} else {
								body.MediaUrl = mediaUrl.split(',').map((url) => url.trim());
							}
						}

						if (toWhatsapp) {
							if (body.From) {
								body.From = `whatsapp:${body.From as string}`;
							}
							body.To = `whatsapp:${body.To}`;

							if (messagingType === 'template') {
								const contentSid = this.getNodeParameter('contentSid', i, '') as string;
								body.ContentSid = contentSid;

								const contentVariables = this.getNodeParameter('contentVariables', i, '') as
									| string
									| object;
								if (contentVariables) {
									try {
										if (typeof contentVariables === 'string') {
											JSON.parse(contentVariables);
											body.ContentVariables = contentVariables;
										} else {
											body.ContentVariables = JSON.stringify(contentVariables);
										}
									} catch (error) {
										throw new NodeOperationError(
											this.getNode(),
											'Content Variables must be valid JSON',
											{ itemIndex: i },
										);
									}
								}
							} else {
								const message = this.getNodeParameter('message', i, '') as string;
								if (message) {
									body.Body = message;
								}
							}
						} else {
							const message = this.getNodeParameter('message', i, '') as string;
							if (message) {
								body.Body = message;
							}
							if (!body.Body && !body.MediaUrl) {
								throw new NodeOperationError(
									this.getNode(),
									'Either "Message" or "Media URL" must be provided',
									{ itemIndex: i },
								);
							}
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

						const options = this.getNodeParameter('options', i, {});

						if (useTwiml) {
							body.Twiml = message;
						} else {
							body.Twiml = `<Response><Say>${escapeXml(message)}</Say></Response>`;
						}

						if (options.record) {
							body.Record = options.record as boolean;
						}

						body.StatusCallback = (options.statusCallback as string) || '';

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

				const responseData = (await twilioApiRequest.call(
					this,
					requestMethod,
					endpoint,
					body,
					qs,
				)) as IDataObject;

				returnData.push(responseData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: (error as Error).message });
					continue;
				}
				throw error;
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
