import type { INodeProperties } from 'n8n-workflow';

import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as getCurrent from './getCurrent.operation';

export { get, getAll, getCurrent };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a user',
				action: 'Get a user',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many users',
				action: 'Get many users',
			},
			{
				name: 'Get Current',
				value: 'getCurrent',
				description: 'Get the currently authenticated user',
				action: 'Get current user',
			},
		],
		default: 'getCurrent',
	},
	...get.description,
	...getAll.description,
	...getCurrent.description,
];
