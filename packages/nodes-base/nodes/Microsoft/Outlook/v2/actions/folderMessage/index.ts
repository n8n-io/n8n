import type { INodeProperties } from 'n8n-workflow';

import * as getAll from './getAll.operation';

export { getAll };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['folderMessage'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieves the messages in a folder',
				action: 'Get many folder messages',
			},
		],
		default: 'getAll',
	},

	...getAll.description,
];
