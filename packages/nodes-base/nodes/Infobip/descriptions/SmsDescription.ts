import type { INodeProperties } from 'n8n-workflow';

export const smsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['sms'],
			},
		},
		options: [
			{
				name: 'Send',
				value: 'send',
				description: 'Send an SMS message',
				action: 'Send an SMS',
				routing: {
					request: {
						method: 'POST',
						url: '/sms/3/messages',
						body: {
							messages: [
								{
									sender: '={{ $parameter["options"]["sender"] }}',
									destinations: [{ to: '={{ $parameter["to"] }}' }],
									content: { text: '={{ $parameter["text"] }}' },
								},
							],
						},
					},
				},
			},
			{
				name: 'Get Many Logs',
				value: 'getLogs',
				description: 'Get the logs of sent SMS messages',
				action: 'Get many SMS logs',
				routing: {
					request: {
						method: 'GET',
						url: '/sms/3/logs',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'results',
								},
							},
						],
					},
				},
			},
		],
		default: 'send',
	},
];

export const smsFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 sms:send                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'To',
		name: 'to',
		type: 'string',
		required: true,
		default: '',
		placeholder: '41793026727',
		description: 'The phone number of the recipient, in international format',
		displayOptions: {
			show: {
				resource: ['sms'],
				operation: ['send'],
			},
		},
	},
	{
		displayName: 'Message',
		name: 'text',
		type: 'string',
		required: true,
		default: '',
		typeOptions: {
			rows: 3,
		},
		displayOptions: {
			show: {
				resource: ['sms'],
				operation: ['send'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['sms'],
				operation: ['send'],
			},
		},
		options: [
			{
				displayName: 'Sender',
				name: 'sender',
				type: 'string',
				default: '',
				description:
					'The sender ID. Use an alphanumeric ID or a number that is registered in your account.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                sms:getLogs                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				resource: ['sms'],
				operation: ['getLogs'],
			},
		},
		routing: {
			send: {
				type: 'query',
				property: 'limit',
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['sms'],
				operation: ['getLogs'],
			},
		},
		options: [
			{
				displayName: 'Bulk ID',
				name: 'bulkId',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'bulkId',
					},
				},
			},
			{
				displayName: 'Message ID',
				name: 'messageId',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'messageId',
					},
				},
			},
			{
				displayName: 'Sender',
				name: 'sender',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'sender',
					},
				},
			},
			{
				displayName: 'Status',
				name: 'generalStatus',
				type: 'options',
				default: 'DELIVERED',
				options: [
					{ name: 'Accepted', value: 'ACCEPTED' },
					{ name: 'Delivered', value: 'DELIVERED' },
					{ name: 'Expired', value: 'EXPIRED' },
					{ name: 'Pending', value: 'PENDING' },
					{ name: 'Rejected', value: 'REJECTED' },
					{ name: 'Undeliverable', value: 'UNDELIVERABLE' },
				],
				routing: {
					send: {
						type: 'query',
						property: 'generalStatus',
					},
				},
			},
			{
				displayName: 'To',
				name: 'destination',
				type: 'string',
				default: '',
				description: 'The phone number of the recipient',
				routing: {
					send: {
						type: 'query',
						property: 'destination',
					},
				},
			},
		],
	},
];
