import * as del from './del';
import * as post from './post';
import * as postEphemeral from './postEphemeral';

import { INodeProperties } from 'n8n-workflow';

export {
	del as delete,
	post,
	postEphemeral,
};

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Soft delete a post, by marking the post as deleted in the database',
			},
			{
				name: 'Post',
				value: 'post',
				description: 'Post a message into a channel',
			},
			{
				name: 'Post Ephemeral',
				value: 'postEphemeral',
				description: 'Post an ephemeral message into a channel',
			},
		],
		default: 'post',
		description: 'The operation to perform',
	},
	...del.description,
	...post.description,
	...postEphemeral.description,
];