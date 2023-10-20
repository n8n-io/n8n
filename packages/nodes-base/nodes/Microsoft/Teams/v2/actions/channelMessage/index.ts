import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as getAll from './getAll.operation';

export { create, getAll };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['channelMessage'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a message',
				action: 'Create a message in a channel',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many messages',
				action: 'Get many messages in a channel',
			},
		],
		default: 'create',
	},

	...create.description,
	...getAll.description,
];
