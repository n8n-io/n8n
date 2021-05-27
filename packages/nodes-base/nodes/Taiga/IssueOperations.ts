import {
	INodeProperties,
} from 'n8n-workflow';

export const issueOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an issue',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an issue',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an issue',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all issues',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an issue',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];
