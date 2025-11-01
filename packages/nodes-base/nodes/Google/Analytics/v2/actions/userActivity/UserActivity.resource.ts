import type { INodeProperties } from 'n8n-workflow';

import * as search from './search.operation';

export { search };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['userActivity'],
			},
		},
		options: [
			{
				name: 'Search',
				value: 'search',
				description: 'Return user activity data',
				action: 'Search user activity data',
			},
		],
		default: 'search',
	},
	...search.description,
];
