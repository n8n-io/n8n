import { INodeProperties } from 'n8n-workflow';

export const Account: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['Account'],
			},
		},
		options: [
			{
				name: 'Get Account Info',
				value: 'AccountInfo',
				action: 'Returns information about the current subscription and account usage',
				description: 'AccountInfo',
			},
		],
		default: 'AccountInfo',
		noDataExpression: true,
	},
];
