import { INodeProperties } from 'n8n-workflow';

export const statusOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'status',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get your status',
			},
			{
				name: 'Set',
				value: 'set',
				description: 'Set your status',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const statusFields = [

/* -------------------------------------------------------------------------- */
/*                                status:set                                  */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Status text',
		name: 'status_text',
		type: 'string',
		default: '',
		placeholder: 'Status text',
		displayOptions: {
			show: {
				operation: [
					'set',
				],
				resource: [
					'status',
				],
			},
		},
		description: 'The status text to set.',
	},
	{
		displayName: 'Status emoji',
		name: 'status_emoji',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: [
					'set',
				],
				resource: [
					'status',
				],
			},
		},
		description: 'The status emoji to set.',
	},
	{
		displayName: 'Status expiration',
		name: 'status_expiration',
		type: 'dateTime',
		default: 0,
		displayOptions: {
			show: {
				operation: [
					'set'
				],
				resource: [
					'status',
				],
			},
		},
		description: 'When this status should expire.',
	},
] as INodeProperties[];
