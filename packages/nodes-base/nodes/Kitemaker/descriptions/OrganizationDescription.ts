import {
	INodeProperties,
} from 'n8n-workflow';

export const organizationOperations: INodeProperties[] = [
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
];
