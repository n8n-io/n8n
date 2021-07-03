import {
	INodeProperties,
} from 'n8n-workflow';

import { messageDeleteDescription } from './delete';
import { messagePostDescription } from './post';
import { messagePostEphemeralDescription } from './postEphemeral';

const messageDescription: INodeProperties[] = [
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
	...messageDeleteDescription,
	...messagePostDescription,
	...messagePostEphemeralDescription,
];

export { messageDescription };