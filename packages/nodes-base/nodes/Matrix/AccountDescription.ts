import {
	INodeProperties,
} from 'n8n-workflow';

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
				name: 'Me',
				value: 'me',
				description: "Get current user's account information",
			},
		],
		default: 'me',
		description: 'The operation to perform.',
	},
] as INodeProperties[];
