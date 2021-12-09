import {
	INodeProperties,
} from 'n8n-workflow';

export const organizationOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform.',
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve data on the logged-in user\'s organization.',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'organization',
				],
			},
		},
	},
] as INodeProperties[];
