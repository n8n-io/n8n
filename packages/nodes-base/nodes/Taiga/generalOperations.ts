import {
	INodeProperties,
} from 'n8n-workflow';

export const generalOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an item',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an item',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an item',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all items',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an item',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];
