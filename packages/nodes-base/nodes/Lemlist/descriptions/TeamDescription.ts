import {
	INodeProperties,
} from 'n8n-workflow';

export const teamOperations = [
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
					'team',
				],
			},
		},
	},
] as INodeProperties[];

export const teamFields = [
	// ----------------------------------
	//        team: get
	// ----------------------------------

] as INodeProperties[];
