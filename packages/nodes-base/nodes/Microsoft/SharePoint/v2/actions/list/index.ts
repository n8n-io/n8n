import type { INodeProperties } from 'n8n-workflow';

import * as get from './get.operation';
import * as getAll from './getAll.operation';

export { get, getAll };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['list'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve details of a single list',
				action: 'Get list',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve a list of lists',
				action: 'Get many lists',
			},
		],
		default: 'get',
	},

	...get.description,
	...getAll.description,
];
