import type { INodeProperties } from 'n8n-workflow';

import * as search from './search.operation';
import { sendErrorPostReceive } from '../../GenericFunctions';

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
				name: 'Search the Web',
				value: 'search',
				action: 'Search the web',
				description: 'Search the web and return ranked results with advanced filtering',
				routing: {
					request: {
						method: 'POST',
						url: '/search',
					},
					output: {
						postReceive: [sendErrorPostReceive],
					},
				},
			},
		],
		default: 'search',
	},

	...search.properties,
];
