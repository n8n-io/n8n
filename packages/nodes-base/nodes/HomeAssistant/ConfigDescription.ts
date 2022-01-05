import {
	INodeProperties
} from 'n8n-workflow';

export const configOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
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
			},
			{
				name: 'Check Configuration',
				value: 'check',
				description: 'Check the configuration',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
];
