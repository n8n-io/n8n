import {
	INodeProperties,
 } from 'n8n-workflow';

export const codeOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'code',
				],
			},
		},
		options: [
			{
				name: 'Javascript',
				value: 'javaScript',
				description: 'Run Javascript via API',
			},
			{
				name: 'Python',
				value: 'python',
				description: 'Run Python via API',
			},
		],
		default: 'javaScript',
	},
] as INodeProperties[];

export const codeFields = [] as INodeProperties[];
