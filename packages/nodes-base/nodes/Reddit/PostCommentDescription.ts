import {
	INodeProperties,
} from 'n8n-workflow';

export const postCommentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'create',
		description: 'Operation to perform',
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a top-level comment in a post',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all comments in a post',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Remove a comment from a post',
			},
			{
				name: 'Reply',
				value: 'reply',
				description: 'Write a reply to a comment in a post',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'postComment',
				],
			},
		},
	},
];

export const postCommentFields: INodeProperties[] = [
	// ----------------------------------
	//        postComment: create
	// ----------------------------------
	{
		displayName: 'Post ID',
		name: 'postId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the post to write the comment to. Found in the post URL: <code>/r/[subreddit_name]/comments/[post_id]/[post_title]</code>',
		placeholder: 'l0me7x',
		displayOptions: {
			show: {
				resource: [
					'postComment',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Comment Text',
		name: 'commentText',
		type: 'string',
		required: true,
		default: '',
		description: 'Text of the comment. Markdown supported.',
		displayOptions: {
			show: {
				resource: [
					'postComment',
				],
				operation: [
					'create',
				],
			},
		},
	},

	// ----------------------------------
	//        postComment: getAll
	// ----------------------------------
	{
		displayName: 'Subreddit',
		name: 'subreddit',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of subreddit where the post is.',
		displayOptions: {
			show: {
				resource: [
					'postComment',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Post ID',
		name: 'postId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the post to get all comments from. Found in the post URL: <code>/r/[subreddit_name]/comments/[post_id]/[post_title]</code>',
		placeholder: 'l0me7x',
		displayOptions: {
			show: {
				resource: [
					'postComment',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Return all results.',
		displayOptions: {
			show: {
				resource: [
					'postComment',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 100,
		description: 'The number of results to return.',
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				resource: [
					'postComment',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
	},

	// ----------------------------------
	//        postComment: delete
	// ----------------------------------
	{
		displayName: 'Comment ID',
		name: 'commentId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the comment to remove. Found in the comment URL:<code>/r/[subreddit_name]/comments/[post_id]/[post_title]/[comment_id]</code>',
		placeholder: 'gla7fmt',
		displayOptions: {
			show: {
				resource: [
					'postComment',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------
	//        postComment: reply
	// ----------------------------------
	{
		displayName: 'Comment ID',
		name: 'commentId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the comment to reply to. To be found in the comment URL: <code>www.reddit.com/r/[subreddit_name]/comments/[post_id]/[post_title]/[comment_id]</code>',
		placeholder: 'gl9iroa',
		displayOptions: {
			show: {
				resource: [
					'postComment',
				],
				operation: [
					'reply',
				],
			},
		},
	},
	{
		displayName: 'Reply Text',
		name: 'replyText',
		type: 'string',
		required: true,
		default: '',
		description: 'Text of the reply. Markdown supported.',
		displayOptions: {
			show: {
				resource: [
					'postComment',
				],
				operation: [
					'reply',
				],
			},
		},
	},
];
