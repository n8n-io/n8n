import {
	INodeProperties,
} from 'n8n-workflow';

export const recipientOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Get All',
				value: 'getAll',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'recipient',
				],
			},
		},
	},
] as INodeProperties[];
