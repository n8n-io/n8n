import {
	INodeProperties,
} from 'n8n-workflow';

export const submissionOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'post',
		description: 'Operation to perform',
		options: [
			{
				name: 'Post',
				value: 'post',
				description: 'Post a submission to a subreddit',
			},
			{
				name: 'Comment',
				value: 'comment',
				description: 'Comment on a submission in a subreddit',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search for a submission in a subreddit',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
			},
		},
	},
] as INodeProperties[];

export const submissionFields = [
	// ----------------------------------
	//         post submission
	// ----------------------------------
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		description: 'Title of the submission, up to 300 characters long',
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'post',
				],
			},
		},
	},
	{
		displayName: 'Subreddit',
		name: 'subreddit',
		type: 'string',
		required: true,
		default: '',
		description: 'Subreddit to post the submission to',
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'post',
				],
			},
		},
	},
	{
		displayName: 'Kind',
		name: 'kind',
		type: 'options',
		options: [
			{
				name: 'Text Post',
				value: 'self',
			},
			{
				name: 'Link Post',
				value: 'link',
			},
			{
				name: 'Image Post',
				value: 'image',
			},
			{
				name: 'Video Post',
				value: 'video',
			},
			{
				name: 'Video GIF Post',
				value: 'videogif',
			},
		],
		default: 'self',
		description: 'The kind of the submission to be posted',
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'post',
				],
			},
		},
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		description: 'URL of the content of the submission',
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'post',
				],
				kind: [
					'link',
					'image',
					'video',
					'videogif',
				],
			},
		},
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		default: '',
		description: 'Text content of the submission (Markdown supported)',
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'post',
				],
				kind: [
					'self',
				],
			},
		},
	},
	{
		displayName: 'Resubmit',
		name: 'resubmit',
		type: 'boolean',
		default: false,
		description: 'If toggled on, the URL will be submitted even if<br>it was already submitted to the subreddit before.<br>Otherwise, a resubmission will trigger an error.',
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'post',
				],
				kind: [
					'link',
					'image',
					'video',
					'videogif',
				],
			},
		},
	},
	// ----------------------------------
	//       comment on submission
	// ----------------------------------
	{
		displayName: 'Target',
		name: 'target',
		type: 'string',
		default: '',
		description: 'ID of the target of the comment. The target can be either<br>the top-level submission or a reply in that submission.',
		placeholder: 't3_15bfi0',
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'comment',
				],
			},
		},
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		default: '',
		description: 'Text content of the comment (Markdown supported)',
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'comment',
				],
			},
		},
	},
	// ----------------------------------
	//       search for submission
	// ----------------------------------
	{
		displayName: 'Subreddit',
		name: 'subreddit',
		type: 'string',
		required: true,
		default: '',
		description: 'Subreddit to search for posts',
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'search',
				],
			},
		},
	},
	{
		displayName: 'Keyword',
		name: 'keyword',
		type: 'string',
		required: true,
		default: '',
		description: 'The keyword for the subreddit post search',
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'search',
				],
			},
		},
	},
] as INodeProperties[];
