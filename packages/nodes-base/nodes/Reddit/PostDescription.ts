import {
	INodeProperties,
} from 'n8n-workflow';

export const postOperations = [
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
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'post',
				],
			},
		},
	},
] as INodeProperties[];

export const postFields = [
	// ----------------------------------
	//         post: create
	// ----------------------------------
	{
		displayName: 'Subreddit',
		name: 'subreddit',
		type: 'string',
		required: true,
		default: '',
		description: 'Subreddit to create the post in.',
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'create',
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
		description: 'The kind of the post to create',
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		description: 'Title of the post, up to 300 characters long.',
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'create',
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
		description: 'URL of the post.',
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'create',
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
		description: 'Text of the post. Markdown supported.',
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'create',
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
		description: 'If toggled on, the URL will be posted even if<br>it was already posted to the subreddit before.<br>Otherwise, the re-posting will trigger an error.',
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'create',
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
	//         post: getAll
	// ----------------------------------
	{
		displayName: 'Subreddit',
		name: 'subreddit',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of subreddit to retrieve the posts from.',
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'options',
		required: true,
		default: 'top',
		description: 'Content of the posts to retrieve.',
		options: [
			{
				name: 'Top Posts',
				value: 'top',
			},
			{
				name: 'Hot Posts',
				value: 'hot',
			},
			{
				name: 'New Posts',
				value: 'new',
			},
			{
				name: 'Rising Posts',
				value: 'rising',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'post',
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
					'post',
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
		default: 5,
		description: 'The number of results to return.',
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				resource: [
					'post',
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
] as INodeProperties[];
