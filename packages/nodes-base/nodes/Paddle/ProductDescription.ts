import {
	INodeProperties,
} from 'n8n-workflow';

export const productOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'product',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all products.',
			}
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const productFields = [
] as INodeProperties[];
