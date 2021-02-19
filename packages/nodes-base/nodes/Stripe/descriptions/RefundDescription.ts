import {
	INodeProperties,
} from 'n8n-workflow';

export const refundOperations = [
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
					'refund',
				],
			},
		},
	},
] as INodeProperties[];

export const refundFields = [
	// ----------------------------------
	//       refund: create
	// ----------------------------------

] as INodeProperties[];
