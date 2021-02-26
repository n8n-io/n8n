import {
	INodeProperties,
} from 'n8n-workflow';

export const accountOperations = [
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
					'account',
				],
			},
		},
	},
] as INodeProperties[];

export const accountFields = [
	// ----------------------------------
	//         account: get
	// ----------------------------------

] as INodeProperties[];
