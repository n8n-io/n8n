import * as del from './del';
import * as post from './post';
import * as postEphemeral from './postEphemeral';

import type { INodeProperties } from 'n8n-workflow';

export { del as delete, post, postEphemeral };

export const descriptions: INodeProperties[] = [
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
				description: 'Soft delete a post, by marking the post as deleted in the database',
				action: 'Delete a message',
			},
			{
				name: 'Post',
				value: 'post',
				description: 'Post a message into a channel',
				action: 'Post a message',
			},
			{
				name: 'Post Ephemeral',
				value: 'postEphemeral',
				description: 'Post an ephemeral message into a channel',
				action: 'Post an ephemeral message',
			},
		],
		default: 'post',
	},
	...del.description,
	...post.description,
	...postEphemeral.description,
];
