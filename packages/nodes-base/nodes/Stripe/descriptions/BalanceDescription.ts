import {
	INodeProperties,
} from 'n8n-workflow';

export const balanceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
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
