import {
	INodeProperties,
 } from 'n8n-workflow';

export const randomOperations = [
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
				name: 'City',
				value: 'randomCity',
				description: 'Run Javascript via API',
			},
			{
				name: 'Name',
				value: 'randomName',
				description: 'Run Python via API',
			},
			{
				name: 'Number',
				value: 'randomNumber',
				description: 'Run Javascript via API',
			},
			{
				name: 'String',
				value: 'randomString',
				description: 'Run Python via API',
			},
		],
		default: 'randomCity',
	},
] as INodeProperties[];

export const randomFields = [] as INodeProperties[];
