import {
	INodeProperties,
} from 'n8n-workflow';

export const postCommentOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'create',
		description: 'Operation to perform',
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Write a top-level comment in a post.',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all comments in a post.',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove a comment from a post.',
			},
			{
				name: 'Reply',
				value: 'reply',
				description: 'Write a reply to a comment in a post.',
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
] as INodeProperties[];

export const postCommentFields = [
	// ----------------------------------
	//        postComment: add
	// ----------------------------------
	{
		displayName: 'Post ID',
		name: 'postId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the post to write the comment to. Found in the post URL:<br><code>/r/[subreddit_name]/comments/[post_id]/[post_title]</code>',
		placeholder: 'l0me7x',
		displayOptions: {
			show: {
				resource: [
					'postComment',
				],
				operation: [
					'add',
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
					'add',
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
		description: 'ID of the post to get all comments from. Found in the post URL:<br><code>/r/[subreddit_name]/comments/[post_id]/[post_title]</code>',
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
	// ----------------------------------
	//        postComment: delete
	// ----------------------------------
	{
		displayName: 'Comment ID',
		name: 'commentId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the comment to remove. Found in the comment URL:<br><code>/r/[subreddit_name]/comments/[post_id]/[post_title]/[comment_id]</code>',
		placeholder: 'gla7fmt',
		displayOptions: {
			show: {
				resource: [
					'postComment',
				],
				operation: [
					'remove',
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
		description: 'ID of the comment to reply to. To be found in the comment URL:<br><code>www.reddit.com/r/[subreddit_name]/comments/[post_id]/[post_title]/[comment_id]</code>',
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
] as INodeProperties[];
