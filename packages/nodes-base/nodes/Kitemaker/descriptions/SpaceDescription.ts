import {
	INodeProperties,
} from 'n8n-workflow';

export const spaceOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'getAll',
		description: 'Operation to perform.',
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve data on all the spaces in the<br>logged-in user\'s organization.',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'space',
				],
			},
		},
	},
] as INodeProperties[];
