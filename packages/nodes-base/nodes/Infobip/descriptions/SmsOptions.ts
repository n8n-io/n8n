import {
	INodeProperties,
} from 'n8n-workflow';

export const smsOptions = [
	{
		displayName: 'Message',
		name: 'text',
		type: 'string',
		required: true,
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
		description:'Content of the message being sent',
	},
	{
		displayName: 'From',
		name: 'from',
		type: 'string',
		required: true,
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
		description:'The sender ID which can be alphanumeric or numeric (e.g., CompanyName)',
	},
	{
		displayName: 'To',
		name: 'to',
		type: 'string',
		required: true,
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
		description:'Comma-separated message destination addresses. Addresses must be in international format (Example: 41793026727).',
	},
] as INodeProperties[];
