import { SEND_AND_WAIT_OPERATION, type INodeProperties } from 'n8n-workflow';

import * as del from './delete.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as move from './move.operation';
import * as reply from './reply.operation';
import * as send from './send.operation';
import * as sendAndWait from './sendAndWait.operation';
import * as update from './update.operation';

export { del as delete, get, getAll, move, reply, send, sendAndWait, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['message'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a message',
				action: 'Delete a message',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a single message',
				action: 'Get a message',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List and search messages',
				action: 'Get many messages',
			},
			{
				name: 'Move',
				value: 'move',
				description: 'Move a message to a folder',
				action: 'Move a message',
			},
			{
				name: 'Reply',
				value: 'reply',
				description: 'Create a reply to a message',
				action: 'Reply to a message',
			},
			{
				name: 'Send',
				value: 'send',
				description: 'Send a message',
				action: 'Send a message',
			},
			{
				name: 'Send and Wait for Response',
				value: SEND_AND_WAIT_OPERATION,
				description: 'Send a message and wait for response',
				action: 'Send message and wait for response',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a message',
				action: 'Update a message',
			},
		],
		default: 'send',
	},

	...del.description,
	...get.description,
	...getAll.description,
	...move.description,
	...reply.description,
	...send.description,
	...sendAndWait.description,
	...update.description,
];
