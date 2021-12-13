import {
	INodeProperties,
} from 'n8n-workflow';

export const reportOptions = [
	{
		displayName: 'Bulk ID',
		name: 'bulkId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'sms',
				],
				operation: [
					'report',
				],
			},
		},
		default: '',
		description:'Bulk ID to retrieve report for',
	},
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'sms',
				],
				operation: [
					'report',
				],
			},
		},
		default: '',
		description:'Message ID to retrieve report for',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'sms',
				],
				operation: [
					'report',
					'receive',
				],
			},
		},
		default: 20,
		description:'Maximum number of results to retrieve.',
	},
] as INodeProperties[];
