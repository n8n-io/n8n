import {
	INodeProperties,
} from 'n8n-workflow';

export const panelistOperations = [
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
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Reinvite',
				value: 'reinvite',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'panelist',
				],
			},
		},
	},
] as INodeProperties[];

export const panelistFields = [
	// ----------------------------------
	//         panelist: create
	// ----------------------------------

] as INodeProperties[];
