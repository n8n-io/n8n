import {
	INodeProperties,
} from 'n8n-workflow';

export const balanceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a balance',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'balance',
				],
			},
		},
	},
];
