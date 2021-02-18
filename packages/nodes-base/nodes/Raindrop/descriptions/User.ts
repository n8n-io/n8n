import {
	INodeProperties,
} from 'n8n-workflow';

export const userOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Get',
				value: 'get',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'user',
				],
			},
		},
	},
] as INodeProperties[];

export const userFields = [
	// ----------------------------------
	//          user: get
	// ----------------------------------

] as INodeProperties[];
