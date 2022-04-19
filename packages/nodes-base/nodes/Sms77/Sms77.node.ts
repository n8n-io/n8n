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
	sms77ApiRequest,
} from './GenericFunctions';

export class Sms77 implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'sms77',
		name: 'sms77',
		icon: 'file:sms77.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Send SMS and make text-to-speech calls',
		defaults: {
			name: 'sms77',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'sms77Api',
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
					{
						name: 'Voice Call',
						value: 'voice',
					},
				],
				default: 'sms',
				description: 'The resource to operate on.',
			},

			// operations
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
						description: 'Send SMS',
					},
				],
				default: 'send',
				description: 'The operation to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'voice',
						],
					},
				},
				options: [
					{
						name: 'Send',
						value: 'send',
						description: 'Converts text to voice and calls a given number',
					},
				],
				default: 'send',
				description: 'The operation to perform',
			},
			{
				displayName: 'From',
				name: 'from',
				type: 'string',
				default: '',
				placeholder: '+4901234567890',
				required: false,
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
				description: 'The caller ID displayed in the receivers display. Max 16 numeric or 11 alphanumeric characters',
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'string',
				default: '',
				placeholder: '+49876543210, MyGroup',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'send',
						],
						resource: [
							'sms',
							'voice',
						],
					},
				},
				description: 'The number of your recipient(s) separated by comma. Can be regular numbers or contact/groups from Sms77',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				required: true,
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				displayOptions: {
					show: {
						operation: [
							'send',
						],
						resource: [
							'sms',
							'voice',
						],
					},
				},
				description: 'The message to send. Max. 1520 characters',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Opton',
				default: {},
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
				options: [
					{
						displayName: 'Debug',
						name: 'debug',
						type: 'boolean',
						default: false,
						description: 'If enabled, the API returns fake responses like in a sandbox',
					},
					{
						displayName: 'Delay',
						name: 'delay',
						type: 'dateTime',
						default: '',
						description: 'Pick a date for time delayed dispatch',
					},
					{
						displayName: 'Foreign ID',
						name: 'foreign_id',
						type: 'string',
						default: '',
						placeholder: 'MyCustomForeignID',
						description: 'Custom foreign ID returned in DLR callbacks',
					},
					{
						displayName: 'Flash',
						name: 'flash',
						type: 'boolean',
						default: false,
						description: 'Send as flash message being displayed directly the receiver\'s display',
					},
					{
						displayName: 'Label',
						name: 'label',
						type: 'string',
						default: '',
						placeholder: 'MyCustomLabel',
						description: 'Custom label used to group analytics',
					},
					{
						displayName: 'No Reload',
						name: 'no_reload',
						type: 'boolean',
						default: false,
						description: 'Disable reload lock to allow sending duplicate messages',
					},
					{
						displayName: 'Performance Tracking',
						name: 'performance_tracking',
						type: 'boolean',
						default: false,
						description: 'Enable performance tracking for URLs found in the message text',
					},
					{
						displayName: 'TTL',
						name: 'ttl',
						type: 'number',
						default: 2880,
						typeOptions: {
							minValue: 1,
						},
						description: 'Custom time to live specifying the validity period of a message in minutes',
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Opton',
				default: {},
				displayOptions: {
					show: {
						operation: [
							'send',
						],
						resource: [
							'voice',
						],
					},
				},
				options: [
					{
						displayName: 'Debug',
						name: 'debug',
						type: 'boolean',
						default: false,
						description: 'If enabled, the API returns fake responses like in a sandbox',
					},
					{
						displayName: 'From',
						name: 'from',
						type: 'string',
						default: '',
						placeholder: '+4901234567890',
						description: 'The caller ID. Please use only verified sender IDs, one of your virtual inbound numbers or one of our shared virtual numbers',
					},
					{
						displayName: 'XML',
						name: 'xml',
						type: 'boolean',
						default: false,
						description: 'Enable if text is of XML format',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: IDataObject[] = [];

		for (let i = 0; i < this.getInputData().length; i++) {
			const resource = this.getNodeParameter('resource', i);
			const operation = this.getNodeParameter('operation', i);
			let responseData;
			try {
				if (resource === 'sms') {
					if (operation === 'send') {
						const from = this.getNodeParameter('from', i) as string;
						const to = this.getNodeParameter('to', i) as string;
						const text = this.getNodeParameter('message', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;
						const body = {
							from,
							to,
							text,
							...options,
						};
						responseData = await sms77ApiRequest.call(this, 'POST', '/sms', body);
					}
				}

				if (resource === 'voice') {
					if (operation === 'send') {
						const to = this.getNodeParameter('to', i) as string;
						const text = this.getNodeParameter('message', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;
						const body = {
							to,
							text,
							...options,
						};
						responseData = await sms77ApiRequest.call(this, 'POST', '/voice', body);
					}
				}

				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else if (responseData !== undefined) {
					returnData.push(responseData as IDataObject);
				}

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
