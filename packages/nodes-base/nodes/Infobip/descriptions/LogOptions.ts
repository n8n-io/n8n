import {
	INodeProperties,
} from 'n8n-workflow';

export const logOptions = [
	{
		displayName: 'Bulk IDs',
		name: 'bulkId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'sms',
				],
				operation: [
					'log',
				],
			},
		},
		default: '',
		description:'Comma-separated list of bulk IDs to retrieve.',
	},
	{
		displayName: 'Message IDs',
		name: 'messageId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'sms',
				],
				operation: [
					'log',
				],
			},
		},
		default: '',
		description:'Comma-separated list of message IDs to retrieve.',
	},
	{
		displayName: 'Advanced Log Search Options',
		name: 'advancedSearch',
		type: 'collection',
		displayOptions: {
			show: {
				resource: [
					'sms',
				],
				operation: [
					'log',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'From',
				name: 'from',
				type: 'string',
				default: '',
				description:'The sender ID which can be alphanumeric or numeric',
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'string',
				default: '',
				description:'Message destination address',
			},
			{
				displayName: 'Status',
				name: 'generalStatus',
				type: 'options',
				default: '',
				description:'Sent message status',
				options: [
					{
						name: 'Any',
						value: '',
					},
					{
						name: 'ACCEPTED',
						value: 'ACCEPTED',
					},
					{
						name: 'PENDING',
						value: 'PENDING',
					},
					{
						name: 'UNDELIVERABLE',
						value: 'UNDELIVERABLE',
					},
					{
						name: 'DELIVERED',
						value: 'DELIVERED',
					},
					{
						name: 'REJECTED',
						value: 'REJECTED',
					},
					{
						name: 'EXPIRED',
						value: 'EXPIRED',
					},
				],
			},
			{
				displayName: 'Sent Since',
				name: 'sentSince',
				type: 'dateTime',
				default: '',
				description:'Sets the lower limit on the date and time filter for sent messages',
			},
			{
				displayName: 'Sent Until',
				name: 'sentUntil',
				type: 'dateTime',
				default: '',
				description:'Sets the upper limit on the date and time filter for sent messages',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 20,
				description:'Maximum number of messages to include in logs - up to 1000',
			},
			{
				displayName: 'Mobile Country Code',
				name: 'mcc',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mobile Network Code',
				name: 'mnc',
				type: 'string',
				default: '',
			},
		],
	},
] as INodeProperties[];
