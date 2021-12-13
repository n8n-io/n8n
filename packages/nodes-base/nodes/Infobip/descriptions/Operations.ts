import {
	INodeProperties,
} from 'n8n-workflow';

export const operations = [
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
				description: 'Send SMS(es)',
			},
			{
				name: 'Dequeue Delivery Report',
				value: 'report',
				description: 'Get and dequeue delivery status for a given message / bulk. NOTE: Will only return reports that arrived since the last API request in the last 48 hours!',
			},
			{
				name: 'Search Logs',
				value: 'log',
				description: 'Get outbound message logs for given search parameters',
			},
			{
				name: 'Get Scheduled Messages',
				value: 'scheduled',
				description: 'See the status and the scheduled time of your SMS messages',
			},
			{
				name: 'Get Scheduled Messages Status',
				value: 'scheduledStatus',
				description: 'See the status of your scheduled SMS messages',
			},
			{
				name: 'Dequeue Received Messages',
				value: 'receive',
				description: 'Fetch and dequeue incoming SMS messages. NOTE: Will only return messages that arrived since the last API request!',
			},
		],
		default: 'send',
		description: 'The operation to perform.',
	},
] as INodeProperties[];
