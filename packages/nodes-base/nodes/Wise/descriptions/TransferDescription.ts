import {
	INodeProperties,
} from 'n8n-workflow';

export const transferOperations = [
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
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'transfer',
				],
			},
		},
	},
] as INodeProperties[];

export const transferFields = [
	// ----------------------------------
	//         transfer: get
	// ----------------------------------

] as INodeProperties[];
