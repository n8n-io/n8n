import type { INodeProperties } from 'n8n-workflow';

export const companyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['company'],
			},
		},
		options: [
			{
				name: 'Get Settings',
				value: 'getSetting',
				description: "Get your company's ProfitWell account settings",
				action: 'Get settings for your company',
			},
		],
		default: 'getSetting',
	},
];
