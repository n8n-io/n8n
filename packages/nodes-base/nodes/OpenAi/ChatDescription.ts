import { INodeProperties } from 'n8n-workflow';

export const chatOperation: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['chat'],
			},
		},
		options: [
			{
				name: 'Generate',
				value: 'generate',
				description: 'Adds a reaction to a message',
				action: 'Add a reaction',
			},
			{
				name: 'Edit',
				value: 'edit',
				description: 'Get the reactions of a message',
				action: 'Get a reaction',
			},
		],
		default: 'generate',
	},
];

export const chatField: INodeProperties[] = [
	// ------------------------------------------------------------------//
	//                         chat:generate                             //
	// ------------------------------------------------------------------//
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['generate'],
			},
		},
		description: '',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['generate'],
			},
		},
		options: [],
	},
];
