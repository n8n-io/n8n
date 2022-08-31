import { INodeProperties } from 'n8n-workflow';

export const postOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'create',
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Submit a post to a subreddit',
				action: 'Create a post',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a post from a subreddit',
				action: 'Delete a post',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a post from a subreddit',
				action: 'Get a post',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all posts from a subreddit',
				action: 'Get all posts',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search posts in a subreddit or in all of Reddit',
				action: 'Search for a post',
			},
		],
		displayOptions: {
			show: {
				resource: ['post'],
			},
		},
	},
];

export const postFields: INodeProperties[] = [
	// ----------------------------------
	//         post: create
	// ----------------------------------
	{
		displayName: 'Subreddit',
		name: 'subreddit',
		type: 'string',
		required: true,
		default: '',
		description: 'Subreddit to create the post in',
		displayOptions: {
			show: {
				resource: ['post'],
				operation: ['create'],
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
		],
		default: 'self',
		description: 'The kind of the post to create',
		displayOptions: {
			show: {
				resource: ['post'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		description: 'Title of the post, up to 300 characters long',
		displayOptions: {
			show: {
				resource: ['post'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		description: 'URL of the post',
		displayOptions: {
			show: {
				resource: ['post'],
				operation: ['create'],
				kind: ['link', 'image'],
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
				resource: ['post'],
				operation: ['create'],
				kind: ['self'],
			},
		},
	},
	{
		displayName: 'Resubmit',
		name: 'resubmit',
		type: 'boolean',
		default: false,
		description:
			'Whether the URL will be posted even if it was already posted to the subreddit before. Otherwise, the re-posting will trigger an error.',
		displayOptions: {
			show: {
				resource: ['post'],
				operation: ['create'],
				kind: ['link', 'image'],
			},
		},
	},

	// ----------------------------------
	//           post: delete
	// ----------------------------------
	{
		displayName: 'Post ID',
		name: 'postId',
		type: 'string',
		required: true,
		default: '',
		description:
			'ID of the post to delete. Found in the post URL: <code>/r/[subreddit_name]/comments/[post_id]/[post_title]</code>',
		placeholder: 'gla7fmt',
		displayOptions: {
			show: {
				resource: ['post'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------
	//           post: get
	// ----------------------------------
	{
		displayName: 'Subreddit',
		name: 'subreddit',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of subreddit to retrieve the post from',
		displayOptions: {
			show: {
				resource: ['post'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Post ID',
		name: 'postId',
		type: 'string',
		required: true,
		default: '',
		description:
			'ID of the post to retrieve. Found in the post URL: <code>/r/[subreddit_name]/comments/[post_id]/[post_title]</code>',
		placeholder: 'l0me7x',
		displayOptions: {
			show: {
				resource: ['post'],
				operation: ['get'],
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
		description: 'The name of subreddit to retrieve the posts from',
		displayOptions: {
			show: {
				resource: ['post'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['post'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 100,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				resource: ['post'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		displayOptions: {
			show: {
				resource: ['post'],
				operation: ['getAll'],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Category',
				name: 'category',
				type: 'options',
				default: 'top',
				description: 'Category of the posts to retrieve',
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
			},
		],
	},

	// ----------------------------------
	//         post: search
	// ----------------------------------
	{
		displayName: 'Location',
		name: 'location',
		type: 'options',
		default: 'subreddit',
		description: 'Location where to search for posts',
		options: [
			{
				name: 'All Reddit',
				value: 'allReddit',
				description: 'Search for posts in all of Reddit',
			},
			{
				name: 'Subreddit',
				value: 'subreddit',
				description: 'Search for posts in a specific subreddit',
			},
		],
		displayOptions: {
			show: {
				resource: ['post'],
				operation: ['search'],
			},
		},
	},
	{
		displayName: 'Subreddit',
		name: 'subreddit',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of subreddit to search in',
		displayOptions: {
			show: {
				resource: ['post'],
				operation: ['search'],
				location: ['subreddit'],
			},
		},
	},
	{
		displayName: 'Keyword',
		name: 'keyword',
		type: 'string',
		default: '',
		required: true,
		description: 'The keyword for the search',
		displayOptions: {
			show: {
				resource: ['post'],
				operation: ['search'],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['post'],
				operation: ['search'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 100,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				resource: ['post'],
				operation: ['search'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['post'],
				operation: ['search'],
			},
		},
		options: [
			{
				displayName: 'Sort',
				name: 'sort',
				placeholder: '',
				type: 'options',
				default: 'relevance',
				description: 'The category to sort results by',
				options: [
					{
						name: 'Comments',
						value: 'comments',
					},
					{
						name: 'Hot',
						value: 'hot',
					},
					{
						name: 'New',
						value: 'new',
					},
					{
						name: 'Relevance',
						value: 'relevance',
					},
					{
						name: 'Top',
						value: 'top',
					},
				],
			},
		],
	},
];
