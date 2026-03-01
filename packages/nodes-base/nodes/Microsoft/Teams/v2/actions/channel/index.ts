import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteChannel from './deleteChannel.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as update from './update.operation';

export { create, deleteChannel, get, getAll, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['channel'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a channel',
				action: 'Create channel',
			},
			{
				name: 'Delete',
				value: 'deleteChannel',
				description: 'Delete a channel',
				action: 'Delete channel',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a channel',
				action: 'Get channel',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many channels',
				action: 'Get many channels',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a channel',
				action: 'Update channel',
			},
		],
		default: 'create',
	},

	...create.description,
	...deleteChannel.description,
	...get.description,
	...getAll.description,
	...update.description,
];
