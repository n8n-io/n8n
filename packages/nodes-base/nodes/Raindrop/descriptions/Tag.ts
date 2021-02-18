import {
	INodeProperties,
} from 'n8n-workflow';

export const tagOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Suggest',
				value: 'suggest',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'tag',
				],
			},
		},
	},
] as INodeProperties[];

export const tagFields = [
	// ----------------------------------
	//       tag: delete
	// ----------------------------------

] as INodeProperties[];
