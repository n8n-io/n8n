import {IExecuteFunctions,} from 'n8n-core';
import {IDataObject, INodeExecutionData, INodeType, INodeTypeDescription, NodeOperationError,} from 'n8n-workflow';
import {sms77ApiRequest} from './GenericFunctions';

export class Sms77 implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sms77',
		name: 'sms77',
		icon: 'file:sms77.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Send SMS',
		defaults: {
			name: 'Sms77',
			color: '#00d46a',
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
						description: 'Send SMS',
					},
				],
				default: 'send',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Label',
				name: 'label',
				type: 'string',
				default: null,
				placeholder: 'MyCustomLabel',
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
				description: 'Custom label used to group analytics.',
			},
			{
				displayName: 'Foreign ID',
				name: 'foreign_id',
				type: 'string',
				default: null,
				placeholder: 'MyCustomForeignID',
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
				description: 'Custom foreign ID returned in DLR callbacks.',
			},
			{
				displayName: 'TTL',
				name: 'ttl',
				type: 'number',
				default: null,
				required: false,
				typeOptions: {minValue: 1},
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
				description: 'Custom time to live specifying the validity period of a message.',
			},
			{
				displayName: 'Debug',
				name: 'debug',
				type: 'boolean',
				default: false,
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
				description: 'If enabled, the API returns fake responses like in a sandbox.',
			},
			{
				displayName: 'Performance Tracking',
				name: 'performance_tracking',
				type: 'boolean',
				default: false,
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
				description: 'Enable performance tracking for URLs found in the message text.',
			},
			{
				displayName: 'Flash',
				name: 'flash',
				type: 'boolean',
				default: false,
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
				description: 'Send as flash message being displayed directly the receiver\'s display.',
			},
			{
				displayName: 'No Reload',
				name: 'no_reload',
				type: 'boolean',
				default: false,
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
				description: 'Disable reload lock to allow sending duplicate messages.',
			},
			{
				displayName: 'From',
				name: 'from',
				type: 'string',
				default: null,
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
				description: 'The caller ID displayed in the receivers display. Max 16 numeric or 11 alphanumeric characters.',
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'string',
				default: '',
				placeholder: '+49876543210',
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
				description: 'The number, with country code, to which to send the message.',
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
		const returnData: IDataObject[] = [];

		for (let i = 0; i < this.getInputData().length; i++) {
			const resource = this.getNodeParameter('resource', i);
			if ('sms' !== resource) {
				throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`);
			}

			const operation = this.getNodeParameter('operation', i);
			if ('send' !== operation) {
				throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`);
			}

			const responseData = await sms77ApiRequest.call(this, 'POST', 'sms', {
				debug: Number(this.getNodeParameter('debug', i)),
				flash: Number(this.getNodeParameter('flash', i)),
				foreign_id: this.getNodeParameter('foreign_id', i),
				from: this.getNodeParameter('from', i),
				label: this.getNodeParameter('label', i),
				performance_tracking: Number(this.getNodeParameter('performance_tracking', i)),
				text: this.getNodeParameter('message', i),
				to: this.getNodeParameter('to', i),
				ttl: this.getNodeParameter('ttl', i),
			});

			returnData.push(responseData);
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
