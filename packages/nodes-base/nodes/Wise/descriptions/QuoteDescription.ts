import {
	INodeProperties,
} from 'n8n-workflow';

export const quoteOperations = [
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
		],
		displayOptions: {
			show: {
				resource: [
					'quote',
				],
			},
		},
	},
] as INodeProperties[];

export const quoteFields = [
	// ----------------------------------
	//         quote: get
	// ----------------------------------

] as INodeProperties[];
