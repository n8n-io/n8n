import {IExecuteFunctions,} from 'n8n-core'
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow'
import {sms77ApiRequest} from './GenericFunctions'

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
				description: 'The operation to perform.',
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
				description: 'The operation to perform.',
			},

			// common options
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
							'sms', 'voice',
						],
					},
				},
				description: 'If enabled, the API returns fake responses like in a sandbox.',
			},

			// sms options
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
				default: 2880,
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
				description: 'Custom time to live specifying the validity period of a message in minutes.',
			},
			{
				displayName: 'Delay',
				name: 'delay',
				type: 'dateTime',
				default: null,
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
				description: 'Pick a date for time delayed dispatch.',
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
				displayName: 'To (recipient)',
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
						],
					},
				},
				description: 'The number of your recipient(s) separated by comma. Can be regular numbers or contact/groups from Sms77.',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				required: true,
				typeOptions: {rows: 5,},
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
				description: 'The message to send. Max. 1520 characters.',
			},

			// voice options
			{
				displayName: 'XML',
				name: 'xml',
				type: 'boolean',
				default: false,
				required: false,
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
				description: 'Enable if text is of XML format.',
			},
			{
				displayName: 'From',
				name: 'from_voice',
				type: 'string',
				default: null,
				placeholder: '+491771783130',
				required: false,
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
				description: 'Determines where the call originates from. Must be a verified number or a shared one from Sms77.',
			},
			{
				displayName: 'To (recipient)',
				name: 'to_voice',
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
							'voice',
						],
					},
				},
				description: 'The number of your recipient(s) with the respective country code.',
			},
			{
				displayName: 'Message',
				name: 'message_voice',
				type: 'string',
				default: '',
				required: true,
				typeOptions: {rows: 5,},
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
				description: 'The message to convert and read loud. Max. 10.000 characters.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: IDataObject[] = [];

		for (let i = 0; i < this.getInputData().length; i++) {
			const operation = this.getNodeParameter('operation', i);

			if ('send' !== operation) {
				throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`);
			}

			const resource = this.getNodeParameter('resource', i);

			switch (resource) {
				case 'sms':
					const delay = this.getNodeParameter('delay', i);

					returnData.push(await sms77ApiRequest.call(this, 'POST', 'sms', {
						debug: Number(this.getNodeParameter('debug', i)),
						delay: delay ? (new Date(delay as string)).getTime() : null,
						flash: Number(this.getNodeParameter('flash', i)),
						foreign_id: this.getNodeParameter('foreign_id', i),
						from: this.getNodeParameter('from', i),
						label: this.getNodeParameter('label', i),
						performance_tracking: Number(this.getNodeParameter('performance_tracking', i)),
						text: this.getNodeParameter('message', i),
						to: this.getNodeParameter('to', i),
						ttl: this.getNodeParameter('ttl', i),
					}));
					break;
				case 'voice':
					returnData.push(await sms77ApiRequest.call(this, 'POST', 'voice', {
						debug: Number(this.getNodeParameter('debug', i)),
						from: this.getNodeParameter('from_voice', i),
						text: this.getNodeParameter('message_voice', i),
						to: this.getNodeParameter('to_voice', i),
						xml: Number(this.getNodeParameter('xml', i)),
					}));
					break;
				default:
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`);
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
