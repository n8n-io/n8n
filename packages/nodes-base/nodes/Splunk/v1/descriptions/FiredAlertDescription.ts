import type { INodeProperties } from 'n8n-workflow';

export const firedAlertOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['firedAlert'],
			},
		},
		options: [
			{
				name: 'Get Report',
				value: 'getReport',
				description: 'Retrieve a fired alerts report',
				action: 'Get a fired alerts report',
			},
		],
		default: 'getReport',
	},
];
