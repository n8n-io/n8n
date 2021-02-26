import {
	INodeProperties,
} from 'n8n-workflow';

export const profileOperations = [
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
					'profile',
				],
			},
		},
	},
] as INodeProperties[];

export const profileFields = [
	// ----------------------------------
	//         profile: get
	// ----------------------------------

] as INodeProperties[];
