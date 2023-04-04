import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { vonageApiRequest } from './GenericFunctions';

export class Vonage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Vonage',
		name: 'vonage',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:vonage.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Vonage API',
		defaults: {
			name: 'Vonage',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'vonageApi',
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
				options: [
					{
						name: 'Send',
						value: 'send',
						action: 'Send an SMS',
					},
				],
				displayOptions: {
					show: {
						resource: ['sms'],
					},
				},
				default: 'send',
			},
			{
				displayName: 'From',
				name: 'from',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['sms'],
						operation: ['send'],
					},
				},
				default: '',
				description: 'The name or number the message should be sent from',
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['sms'],
						operation: ['send'],
					},
				},
				default: '',
				description:
					'The number that the message should be sent to. Numbers are specified in E.164 format.',
			},
			// {
			// 	displayName: 'Type',
			// 	name: 'type',
			// 	type: 'options',
			// 	displayOptions: {
			// 		show: {
			// 			resource: [
			// 				'sms',
			// 			],
			// 			operation: [
			// 				'send',
			// 			],
			// 		},
			// 	},
			// 	options: [
			// 		{
			// 			name: 'Binary',
			// 			value: 'binary',
			// 		},
			// 		{
			// 			name: 'Text',
			// 			value: 'text',
			// 		},
			// 		{
			// 			name: 'Wappush',
			// 			value: 'wappush',
			// 		},
			// 		{
			// 			name: 'Unicode',
			// 			value: 'unicode',
			// 		},
			// 		{
			// 			name: 'VCAL',
			// 			value: 'vcal',
			// 		},
			// 		{
			// 			name: 'VCARD',
			// 			value: 'vcard',
			// 		},
			// 	],
			// 	default: 'text',
			// 	description: 'The format of the message body',
			// },
			// {
			// 	displayName: 'Binary Property',
			// 	name: 'binaryPropertyName',
			// 	displayOptions: {
			// 		show: {
			// 			resource: [
			// 				'sms',
			// 			],
			// 			operation: [
			// 				'send',
			// 			],
			// 			type: [
			// 				'binary',
			// 			],
			// 		},
			// 	},
			// 	type: 'string',
			// 	default: 'data',
			// 	description: 'Object property name which holds binary data.',
			// 	required: true,
			// },
			// {
			// 	displayName: 'Body',
			// 	name: 'body',
			// 	type: 'string',
			// 	displayOptions: {
			// 		show: {
			// 			resource: [
			// 				'sms',
			// 			],
			// 			operation: [
			// 				'send',
			// 			],
			// 			type: [
			// 				'binary',
			// 			],
			// 		},
			// 	},
			// 	default: '',
			// 	description: 'Hex encoded binary data',
			// },
			// {
			// 	displayName: 'UDH',
			// 	name: 'udh',
			// 	type: 'string',
			// 	displayOptions: {
			// 		show: {
			// 			resource: [
			// 				'sms',
			// 			],
			// 			operation: [
			// 				'send',
			// 			],
			// 			type: [
			// 				'binary',
			// 			],
			// 		},
			// 	},
			// 	default: '',
			// 	description: 'Your custom Hex encoded User Data Header',
			// },
			// {
			// 	displayName: 'Title',
			// 	name: 'title',
			// 	displayOptions: {
			// 		show: {
			// 			resource: [
			// 				'sms',
			// 			],
			// 			operation: [
			// 				'send',
			// 			],
			// 			type: [
			// 				'wappush',
			// 			],
			// 		},
			// 	},
			// 	type: 'string',
			// 	default: '',
			// 	description: 'The title for a wappush SMS',
			// },
			// {
			// 	displayName: 'URL',
			// 	name: 'url',
			// 	type: 'string',
			// 	displayOptions: {
			// 		show: {
			// 			resource: [
			// 				'sms',
			// 			],
			// 			operation: [
			// 				'send',
			// 			],
			// 			type: [
			// 				'wappush',
			// 			],
			// 		},
			// 	},
			// 	default: '',
			// 	description: 'The URL of your website',
			// },
			// {
			// 	displayName: 'Validity (in minutes)',
			// 	name: 'validity',
			// 	type: 'number',
			// 	default: 0,
			// 	displayOptions: {
			// 		show: {
			// 			resource: [
			// 				'sms',
			// 			],
			// 			operation: [
			// 				'send',
			// 			],
			// 			type: [
			// 				'wappush',
			// 			],
			// 		},
			// 	},
			// 	description: 'The availability for an SMS in minutes',
			// },
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['sms'],
						operation: ['send'],
						// type: [
						// 	'text',
						// 	'unicode',
						// ],
					},
				},
				default: '',
				description: 'The body of the message being sent',
			},
			// {
			// 	displayName: 'VCard',
			// 	name: 'vcard',
			// 	type: 'string',
			// 	displayOptions: {
			// 		show: {
			// 			resource: [
			// 				'sms',
			// 			],
			// 			operation: [
			// 				'send',
			// 			],
			// 			type: [
			// 				'vcard',
			// 			],
			// 		},
			// 	},
			// 	default: '',
			// 	description: 'A business card in vCard format',
			// },
			// {
			// 	displayName: 'VCal',
			// 	name: 'vcal',
			// 	type: 'string',
			// 	displayOptions: {
			// 		show: {
			// 			resource: [
			// 				'sms',
			// 			],
			// 			operation: [
			// 				'send',
			// 			],
			// 			type: [
			// 				'vcal',
			// 			],
			// 		},
			// 	},
			// 	default: '',
			// 	description: 'A calendar event in vCal format',
			// },
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						resource: ['sms'],
						operation: ['send'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Account Ref',
						name: 'account-ref',
						type: 'string',
						default: '',
						description:
							'An optional string used to identify separate accounts using the SMS endpoint for billing purposes. To use this feature, please email support@nexmo.com.',
					},
					{
						displayName: 'Callback',
						name: 'callback',
						type: 'string',
						default: '',
						description:
							'The webhook endpoint the delivery receipt for this sms is sent to. This parameter overrides the webhook endpoint you set in Dashboard.',
					},
					{
						displayName: 'Client Ref',
						name: 'client-ref',
						type: 'string',
						default: '',
						description: 'You can optionally include your own reference of up to 40 characters',
					},
					{
						displayName: 'Message Class',
						name: 'message-class',
						type: 'options',
						options: [
							{
								name: '0',
								value: 0,
							},
							{
								name: '1',
								value: 1,
							},
							{
								name: '2',
								value: 2,
							},
							{
								name: '3',
								value: 3,
							},
						],
						default: '',
						description: 'The Data Coding Scheme value of the message',
					},
					{
						displayName: 'Protocol ID',
						name: 'protocol-id',
						type: 'string',
						default: '',
						description:
							'The value of the protocol identifier to use. Ensure that the value is aligned with udh.',
					},
					{
						displayName: 'Status Report Req',
						name: 'status-report-req',
						type: 'boolean',
						default: false,
						description: 'Whether to receive a Delivery Receipt',
					},
					{
						displayName: 'TTL (in Minutes)',
						name: 'ttl',
						type: 'number',
						default: 4320,
						description: 'By default Nexmo attempt delivery for 72 hours',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'sms') {
					if (operation === 'send') {
						const from = this.getNodeParameter('from', i) as string;

						const to = this.getNodeParameter('to', i) as string;

						const type = this.getNodeParameter('type', i, 'text') as string;

						const body: IDataObject = {
							from,
							to,
							type,
						};

						if (type === 'text' || type === 'unicode') {
							const message = this.getNodeParameter('message', i) as string;

							body.text = message;
						}

						if (type === 'binary') {
							const data = this.getNodeParameter('body', i) as string;

							const udh = this.getNodeParameter('udh', i) as string;

							body.udh = udh;

							body.body = data;
						}

						if (type === 'wappush') {
							const title = this.getNodeParameter('title', i) as string;

							const url = this.getNodeParameter('url', i) as string;

							const validity = this.getNodeParameter('validity', i) as number;

							body.title = title;

							body.url = url;

							body.validity = validity * 60000;
						}

						if (type === 'vcard') {
							const vcard = this.getNodeParameter('vcard', i) as string;

							body.vcard = vcard;
						}

						if (type === 'vcal') {
							const vcal = this.getNodeParameter('vcal', i) as string;

							body.vcal = vcal;
						}

						const additionalFields = this.getNodeParameter('additionalFields', i);

						Object.assign(body, additionalFields);

						if (body.ttl) {
							// transform minutes to milliseconds
							body.ttl = (body.ttl as number) * 60000;
						}

						responseData = await vonageApiRequest.call(this, 'POST', '/sms/json', body);

						responseData = responseData.messages;
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else if (responseData !== undefined) {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
