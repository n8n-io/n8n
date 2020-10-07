import { INodeProperties } from 'n8n-workflow';

export const accountOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'account',
				],
			},
		},
		options: [
			{
				name: 'Who am I',
				value: 'whoami',
				description: 'Get information about current user',
			},
		],
		default: 'whoami',
		description: 'The operation to perform.',
	},
] as INodeProperties[];
