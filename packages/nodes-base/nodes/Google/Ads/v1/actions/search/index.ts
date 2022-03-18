import * as search from './search';

import { INodeProperties } from 'n8n-workflow';

export {
	search
};

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['search'],
			},
		},
		options: [
			{
				name: 'Search',
				value: 'search',
				description: 'Execute a custom query',
			},
		],
		default: 'search',
		description: 'The operation to perform',
	},
	...search.description,
];
