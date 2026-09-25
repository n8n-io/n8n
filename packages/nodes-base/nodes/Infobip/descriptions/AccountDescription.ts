import type { INodeProperties } from 'n8n-workflow';

export const accountOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['account'],
			},
		},
		options: [
			{
				name: 'Get Balance',
				value: 'getBalance',
				description: 'Get the current balance of the account',
				action: 'Get the account balance',
				routing: {
					request: {
						method: 'GET',
						url: '/account/1/balance',
					},
				},
			},
		],
		default: 'getBalance',
	},
];
