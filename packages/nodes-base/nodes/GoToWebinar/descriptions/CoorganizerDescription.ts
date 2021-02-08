import {
	INodeProperties,
} from 'n8n-workflow';

export const coorganizerOperations = [
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
					'coorganizer',
				],
			},
		},
	},
] as INodeProperties[];

export const coorganizerFields = [
	// ----------------------------------
	//         coorganizer: create
	// ----------------------------------

] as INodeProperties[];
