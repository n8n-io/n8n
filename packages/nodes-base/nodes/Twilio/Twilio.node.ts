import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ILoadOptionsFunctions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	escapeXml,
	findOptedOutChat,
	getMessagingServices,
	transformDataToSendSMS,
	twilioApiRequest,
} from './GenericFunctions';
import { fromFields, fromOptions, toOptions } from './descriptions';

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
			...fromOptions,
			...fromFields,
			...toOptions,
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
				displayName: `- Messages sent via Twilio can include up to 10 media files.
			- supported mime types: <a href="https://www.twilio.com/docs/sms/accepted-mime-types">https://www.twilio.com/docs/sms/accepted-mime-types</a>
			- images only restrictions: total size is up to 5MB. Twilio will resize images as necessary for successful delivery based on carrier specifications. Messages with over 5MB of media will not be accepted.
			- other mime types Or other mime types + images restrictions:
			according to this: <a href="https://support.twilio.com/hc/en-us/articles/360018832773-Twilio-Programmable-SMS-Supported-File-Types-and-Size-Limits-for-MMS-Media-Messages">https://support.twilio.com/hc/en-us/articles/360018832773-Twilio-Programmable-SMS-Supported-File-Types-and-Size-Limits-for-MMS-Media-Messages</a>
			for long code numbers (the one we use) the maximum total size of attachments shouldn't exceed 1.0 MB if there are non image attachments.`,
				name: 'twilioMediaFilesNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						operation: ['send'],
						resource: ['sms'],
					},
				},
			},
			{
				displayName: 'Media Urls',
				name: 'mediaUrls',
				type: 'json',
				default: '[]',
				displayOptions: {
					show: {
						operation: ['send'],
						resource: ['sms'],
					},
				},
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

	methods = {
		loadOptions: {
			async getMessagingServicesOptions(this: ILoadOptionsFunctions) {
				return getMessagingServices.call(this);
			},
		},
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

				resource = this.getNodeParameter('resource', i);
				operation = this.getNodeParameter('operation', i);

				if (resource === 'sms') {
					if (operation === 'send') {
						// ----------------------------------
						//         sms:send
						// ----------------------------------

						requestMethod = 'POST';
						endpoint = '/Messages.json';

						const isSmsChatReusableUsed = Boolean(process.env.SMS_CHAT_REUSABLE_USED);

						const from = this.getNodeParameter('from', i) as string;
						const to = this.getNodeParameter('to', i) as string;
						const message = this.getNodeParameter('message', i) as string;
						const number = this.getNodeParameter('number', i) as string;
						const messagingService = this.getNodeParameter('messagingService', i) as string;
						const mediaUrlsRaw = this.getNodeParameter('mediaUrls', i) as string;
						let mediaUrls: string[] = [];
						const fallbackPhone = this.getNodeParameter('fallbackPhone', i) as string;
						const toWhatsapp = this.getNodeParameter('toWhatsapp', i) as boolean;
						let useFallbackPhone = false;

						if (message.length > 320) {
							throw new NodeOperationError(
								this.getNode(),
								'Message is too long, the maximum number of characters should be 320',
								{ itemIndex: i },
							);
						}

						try {
							mediaUrls = JSON.parse(mediaUrlsRaw);
							if (!Array.isArray(mediaUrls)) {
								throw new NodeOperationError(this.getNode(), 'mediaUrls should be an array', {
									itemIndex: i,
								});
							}
							if (mediaUrls.some((url) => typeof url !== 'string')) {
								throw new NodeOperationError(
									this.getNode(),
									'mediaUrls should be an array of strings',
									{ itemIndex: i },
								);
							}
							if (mediaUrls.length > 10) {
								throw new NodeOperationError(this.getNode(), 'Maximum number of media urls is 10', {
									itemIndex: i,
								});
							}
						} catch (error) {
							throw new NodeOperationError(
								this.getNode(),
								'Invalid data provided for mediaUrls, please send a json value of array of strings.',
								{ itemIndex: i },
							);
						}

						if (!message && !mediaUrls.length) {
							throw new NodeOperationError(
								this.getNode(),
								'One of message or media url is required',
								{ itemIndex: i },
							);
						}

						if (isSmsChatReusableUsed) {
							const mainPhoneOptedOutChat = await findOptedOutChat(to);
							if (mainPhoneOptedOutChat) {
								if (!fallbackPhone) {
									throw new NodeOperationError(
										this.getNode(),
										"Fallback phone is required because the recipient's main phone has opted out from chat",
										{ itemIndex: i },
									);
								}
								const fallbackPhoneOptedOutChat = await findOptedOutChat(fallbackPhone);

								if (fallbackPhoneOptedOutChat) {
									throw new NodeOperationError(
										this.getNode(),
										"Recipient's main phone and fallback phone are opted out from chat",
										{ itemIndex: i },
									);
								}
								useFallbackPhone = true;
							}
						}
						body = transformDataToSendSMS(
							{
								message,
								from,
								toWhatsapp,
								to,
								number,
								messagingService,
								mediaUrls,
								useFallbackPhone,
								fallbackPhone,
							},
							body,
						);
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
