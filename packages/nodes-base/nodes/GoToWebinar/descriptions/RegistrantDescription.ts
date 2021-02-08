import {
	INodeProperties,
} from 'n8n-workflow';

export const registrantOperations = [
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
		],
		displayOptions: {
			show: {
				resource: [
					'registrant',
				],
			},
		},
	},
] as INodeProperties[];

export const registrantFields = [
	// ----------------------------------
	//         registrant: create
	// ----------------------------------

] as INodeProperties[];
