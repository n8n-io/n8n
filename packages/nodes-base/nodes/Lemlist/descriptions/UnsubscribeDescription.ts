import {
	INodeProperties,
} from 'n8n-workflow';

export const unsubscribeOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'create',
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
				name: 'Get All',
				value: 'getAll',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'unsubscribe',
				],
			},
		},
	},
] as INodeProperties[];

export const unsubscribeFields = [
	// ----------------------------------
	//        unsubscribe: get
	// ----------------------------------

] as INodeProperties[];
