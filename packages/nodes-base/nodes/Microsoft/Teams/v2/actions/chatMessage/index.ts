import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';

export { create, get, getAll };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['chatMessage'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a message',
				action: 'Create a chat message',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a message',
				action: 'Get a chat message',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many messages',
				action: 'Get many chat messages',
			},
		],
		default: 'create',
	},

	...create.description,
	...get.description,
	...getAll.description,
];
