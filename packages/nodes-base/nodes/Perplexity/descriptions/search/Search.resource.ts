import type { INodeProperties } from 'n8n-workflow';

import { searchErrorPostReceive } from '../../GenericFunctions';
import * as searchOp from './search.operation';

export const description: INodeProperties[] = [
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
				name: 'Search',
				value: 'search',
				action: 'Search the web',
				description: 'Get raw, ranked web search results with filtering and content extraction',
				routing: {
					request: {
						method: 'POST',
						url: '/search',
					},
					output: {
						postReceive: [searchErrorPostReceive],
					},
				},
			},
		],
		default: 'search',
	},

	...searchOp.description,
];
