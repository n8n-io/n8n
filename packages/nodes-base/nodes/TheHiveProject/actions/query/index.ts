import type { INodeProperties } from 'n8n-workflow';

import * as executeQuery from './executeQuery.operation';

export { executeQuery };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		noDataExpression: true,
		type: 'options',
		required: true,
		default: 'executeQuery',
		options: [
			{
				name: 'Execute query',
				value: 'executeQuery',
				action: 'Execute a query',
			},
		],
		displayOptions: {
			show: {
				resource: ['query'],
			},
		},
	},
	...executeQuery.description,
];
