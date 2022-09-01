import {
	INodeProperties,
} from 'n8n-workflow';

export const companyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'company',
				],
			},
		},
		options: [
			{
				name: 'Get Settings',
				value: 'getSetting',
				description: 'Get your companys ProfitWell account settings',
			},
		],
		default: 'getSetting',
	},
];
