import {
	INodeProperties,
} from 'n8n-workflow';

export const companyOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
			},
		},
		options: [
			{
				name: 'Get Your Company Account Settings',
				value: 'getCompany',
				description: 'Get your companys ProfitWell account settings',
			},
		],
		default: 'getCompany',
		description: 'The operation to perform.',
	},
] as INodeProperties[];
