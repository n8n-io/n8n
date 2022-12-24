import type { INodeProperties } from 'n8n-workflow';

export const auditOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'get',
		displayOptions: {
			show: {
				resource: ['audit'],
			},
		},
		options: [
			{
				name: 'Generate',
				value: 'generate',
				action: 'Generate a security audit',
				description: 'Generate a security audit for this n8n instance',
				routing: {
					request: {
						method: 'POST',
						url: '/audit',
					},
				},
			},
		],
	},
];

export const auditFields: INodeProperties[] = [
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		displayOptions: {
			show: {
				resource: ['audit'],
			},
		},
		routing: {
			request: {
				body: {
					filters: '={{ $value }}',
				},
			},
		},
		default: {},
		options: [
			{
				displayName: 'Categories',
				name: 'categories',
				description: 'Risk categories to include in the audit',
				type: 'multiOptions',
				default: [],
				options: [
					{
						name: 'Credentials',
						value: 'credentials',
					},
					{
						name: 'Database',
						value: 'database',
					},
					{
						name: 'Execution',
						value: 'execution',
					},
					{
						name: 'Filesystem',
						value: 'filesystem',
					},
					{
						name: 'Instance',
						value: 'instance',
					},
				],
			},
		],
	},
];
