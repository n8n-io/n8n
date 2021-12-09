import {
	INodeProperties,
} from 'n8n-workflow';

export const profileOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'profile',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get the user\'s personal information.',
			},
		],
		default: 'get',
		description: 'Operation to perform.',
	},
];
