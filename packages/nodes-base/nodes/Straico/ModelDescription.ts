import type { INodeProperties } from 'n8n-workflow';

export const modelOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['model'],
			},
		},
		options: [
			{
				name: 'Get List (v0)',
				value: 'getListV0',
				description: 'Get list of available models (v0)',
				action: 'Get list of models v0',
			},
			{
				name: 'Get List (v1)',
				value: 'getListV1',
				description: 'Get list of available models (v1)',
				action: 'Get list of models v1',
			},
		],
		default: 'getListV1',
	},
];

export const modelFields: INodeProperties[] = [];
