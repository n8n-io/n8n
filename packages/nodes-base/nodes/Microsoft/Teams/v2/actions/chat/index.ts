import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';

export { create };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['chat'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a chat',
				action: 'Create chat',
			},
		],
		default: 'create',
	},

	...create.description,
];
