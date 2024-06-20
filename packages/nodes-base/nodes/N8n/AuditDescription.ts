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
		displayName: 'Additional Options',
		name: 'additionalOptions',
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
					additionalOptions: '={{ $value }}',
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
						name: 'Filesystem',
						value: 'filesystem',
					},
					{
						name: 'Instance',
						value: 'instance',
					},
					{
						name: 'Nodes',
						value: 'nodes',
					},
				],
			},
			{
				displayName: 'Days Abandoned Workflow',
				name: 'daysAbandonedWorkflow',
				description: 'Days for a workflow to be considered abandoned if not executed',
				type: 'number',
				default: 90,
			},
		],
	},
];
