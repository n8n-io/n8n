import {
	INodeProperties,
} from 'n8n-workflow';

export const productOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'product',
				],
			},
		},
	},
] as INodeProperties[];

export const productFields = [
	// ----------------------------------
	//       product: create
	// ----------------------------------

] as INodeProperties[];
