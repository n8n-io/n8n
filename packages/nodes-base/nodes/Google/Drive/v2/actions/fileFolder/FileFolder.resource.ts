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
				resource: ['fileFolder'],
			},
		},
		options: [
			{
				name: 'Search',
				value: 'search',
				description: 'Search a folder',
				action: 'Search a folder',
			},
		],
		default: 'search',
	},
	...search.description,
];
