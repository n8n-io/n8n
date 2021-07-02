import {IExecuteFunctions,} from 'n8n-core';
import {IDataObject, INodeExecutionData, INodeType, INodeTypeDescription, NodeOperationError,} from 'n8n-workflow';
import {sms77ApiRequest} from './GenericFunctions';

export class Sms77 implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'sms77',
		name: 'sms77',
		icon: 'file:sms77.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Send SMS',
		defaults: {
			name: 'Sms77',
			color: '#18D46A',
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
				description: 'The number from which to send the message.',
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
				description: 'The number, with coutry code, to which to send the message.',
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

			const responseData = await sms77ApiRequest.call(this, 'POST', 'sms', {}, {
				from: this.getNodeParameter('from', i),
				to: this.getNodeParameter('to', i),
				text: this.getNodeParameter('message', i),
			});

			returnData.push(responseData);
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
