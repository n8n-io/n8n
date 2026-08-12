import type { ReactionProperties } from '../../Interfaces';

export const reactionCreateDescription: ReactionProperties = [
	{
		displayName: 'User Name or ID',
		name: 'userId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getUsers',
		},
		options: [],
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['reaction'],
				operation: ['create'],
			},
		},
		description:
			'ID of the user sending the reaction. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Post ID',
		name: 'postId',
		type: 'string',
		default: '',
		placeholder: '3moacfqxmbdw38r38fjprh6zsr',
		required: true,
		displayOptions: {
			show: {
				resource: ['reaction'],
				operation: ['create'],
			},
		},
		description:
			'ID of the post to react to. Obtainable from the post link: <code>https://mattermost.internal.n8n.io/[server]/pl/[postId]</code>',
	},
	{
		displayName: 'Emoji Name',
		name: 'emojiName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['reaction'],
				operation: ['create'],
			},
		},
		description: 'Emoji to use for this reaction',
	},
];
