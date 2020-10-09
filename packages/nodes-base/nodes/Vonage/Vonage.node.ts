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
	vonageApiRequest,
} from './GenericFunctions';

export class Vonage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Vonage',
		name: 'vonage',
		icon: 'file:vonage.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Vonage API',
		defaults: {
			name: 'Vonage',
			color: '#000000',
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
				options: [
					{
						name: 'SMS',
						value: 'sms',
					},
				],
				default: 'sms',
				description: 'The resource to operate on.'
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Send',
						value: 'send',
					},
				],
				displayOptions: {
					show: {
						resource: [
							'sms',
						],
					},
				},
				default: 'send',
				description: 'The resource to operate on.'
			},
			{
				displayName: 'From',
				name: 'from',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'sms',
						],
						operation: [
							'send',
						],
					},
				},
				default: '',
				description: `The name or number the message should be sent from`,
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'sms',
						],
						operation: [
							'send',
						],
					},
				},
				default: '',
				description: `The number that the message should be sent to. Numbers are specified in E.164 format.`,
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'sms',
						],
						operation: [
							'send',
						],
					},
				},
				default: '',
				description: `The body of the message being sent`,
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
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
				default: {},
				options: [
					{
						displayName: 'Account Ref',
						name: 'account-ref',
						type: 'string',
						default: '',
						description: 'An optional string used to identify separate accounts using the SMS endpoint for billing purposes. To use this feature, please email support@nexmo.com',
					},
					{
						displayName: 'Body',
						name: 'body',
						type: 'string',
						default: '',
						description: 'Hex encoded binary data. Depends on type parameter having the value binary.',
					},
					{
						displayName: 'Callback',
						name: 'callback',
						type: 'string',
						default: '',
						description: 'The webhook endpoint the delivery receipt for this sms is sent to. This parameter overrides the webhook endpoint you set in Dashboard.',
					},
					{
						displayName: 'Client Ref',
						name: 'client-ref',
						type: 'string',
						default: '',
						description: 'You can optionally include your own reference of up to 40 characters.',
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
						description: 'The value of the protocol identifier to use. Ensure that the value is aligned with udh.',
					},
					{
						displayName: 'Status Report Req',
						name: 'status-report-req',
						type: 'boolean',
						default: false,
						description: 'Boolean indicating if you like to receive a Delivery Receipt.',
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						description: 'The title for a wappush SMS. Depends on type parameter having the value wappush',
					},
					{
						displayName: 'TTL (in minutes)',
						name: 'ttl',
						type: 'number',
						default: 4320,
						description: 'By default Nexmo attempt delivery for 72 hours',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{
								name: 'Binary',
								value: 'binary',
							},
							{
								name: 'Text',
								value: 'text',
							},
							{
								name: 'Wappush',
								value: 'wappush',
							},
							{
								name: 'Unicode',
								value: 'unicode',
							},
							{
								name: 'VCAL',
								value: 'vcal',
							},
							{
								name: 'VCARD',
								value: 'vcard',
							},
						],
						default: 'text',
						description: 'The format of the message body',
					},
					{
						displayName: 'UDH',
						name: 'udh',
						type: 'string',
						default: '',
						description: 'Your custom Hex encoded User Data Header. Depends on type parameter having the value binary.',
					},
					{
						displayName: 'URL',
						name: 'url',
						type: 'string',
						default: '',
						description: 'The URL of your website. Depends on type parameter having the value wappush.',
					},
					{
						displayName: 'Validity',
						name: 'validity',
						type: 'string',
						default: '',
						description: 'The availability for an SMS in milliseconds. Depends on type parameter having the value wappush.',
					},
					{
						displayName: 'VCal',
						name: 'vcal',
						type: 'string',
						default: '',
						description: 'A calendar event in vCal format. Depends on type parameter having the value vcal.',
					},
					{
						displayName: 'VCard',
						name: 'vcard',
						type: 'string',
						default: '',
						description: 'A business card in vCard format. Depends on type parameter having the value vcard.',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {

			if (resource === 'sms') {

				if (operation === 'send') {

					const from = this.getNodeParameter('from', i) as string;

					const to = this.getNodeParameter('to', i) as string;

					const message = this.getNodeParameter('message', i) as string;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					const body: IDataObject = {
						from,
						to,
						text: message,
					};

					Object.assign(body, additionalFields);

					responseData = await vonageApiRequest.call(this, 'POST', '/sms/json', body);

					responseData = responseData.messages;
				}
			}
		}
		if (Array.isArray(responseData)) {
			returnData.push.apply(returnData, responseData as IDataObject[]);
		} else if (responseData !== undefined) {
			returnData.push(responseData as IDataObject);
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
