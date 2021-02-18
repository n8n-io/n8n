import {
	INodeProperties,
} from 'n8n-workflow';

export const raindropOperations = [
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
					'raindrop',
				],
			},
		},
	},
] as INodeProperties[];

export const raindropFields = [
	// ----------------------------------
	//       raindrop: create
	// ----------------------------------

] as INodeProperties[];
