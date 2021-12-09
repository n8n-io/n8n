import { INodeProperties } from 'n8n-workflow';

export const smsOperations: INodeProperties[] = [
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
				description: 'Send a sms',
			},
		],
		default: 'send',
		description: 'The operation to perform.',
	},
];

export const smsFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                                sms:send                                    */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'From',
		name: 'from',
		type: 'string',
		required: true,
		default: '',
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
		description: 'Customizable sender name. Should be between 3 and 11 characters in length, only alphanumeric characters are allowed.',
	},
	{
		displayName: 'To',
		name: 'to',
		type: 'string',
		required: true,
		default: '',
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
		description: 'Message recipient. Should be between 3 and 15 characters in length. The number always starts with a plus sign followed by a country code, followed by the number. Phone numbers are expected to comply with the E.164 format.',
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
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
	},
];
