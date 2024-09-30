import * as search from './search.operation';
import * as search_adv from './search_adv.operation';

import type { INodeProperties } from 'n8n-workflow';

export { search, search_adv };

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['search'],
			},
		},
		options: [
			{
				name: 'File Search',
				value: 'search',
				description: 'Search for a file in a specific library by its file name',
				action: 'Search a file',
			},
			{
				name: 'File Search (Advanced)',
				value: 'search_adv',
				description: 'Search for a file or file content with advanced filters',
				action: 'Search a file / file content',
			},
		],
		default: 'search',
	},
	...search.description,
	...search_adv.description,
];
