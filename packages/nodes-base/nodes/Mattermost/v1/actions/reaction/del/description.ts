import {
	ReactionProperties,
} from '../../Interfaces';

export const reactionDeleteDescription: ReactionProperties = [
	{
		displayName: 'User ID',
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
				resource: [
					'reaction',
				],
				operation: [
					'delete',
				],
			},
		},
		description: 'ID of the user whose reaction to delete.',
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
				resource: [
					'reaction',
				],
				operation: [
					'delete',
				],
			},
		},
		description: 'ID of the post whose reaction to delete. Obtainable from the post link: <code>https://mattermost.internal.n8n.io/[server]/pl/[postId]</code>',
	},
	{
		displayName: 'Emoji Name',
		name: 'emojiName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'reaction',
				],
				operation: [
					'delete',
				],
			},
		},
		description: 'Name of the emoji to delete.',
	},
];
