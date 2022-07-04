import {
	INodeProperties
} from 'n8n-workflow';

export const configOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'config',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get the configuration',
				action: 'Get a config',
			},
			{
				name: 'Check Configuration',
				value: 'check',
				description: 'Check the configuration',
				action: 'Check a config',
			},
		],
		default: 'get',
	},
];
