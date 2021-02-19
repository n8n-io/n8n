import {
	INodeProperties,
} from 'n8n-workflow';

export const payoutOperations = [
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
					'payout',
				],
			},
		},
	},
] as INodeProperties[];

export const payoutFields = [
	// ----------------------------------
	//       payout: create
	// ----------------------------------

] as INodeProperties[];
