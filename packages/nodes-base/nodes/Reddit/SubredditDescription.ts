import {
	INodeProperties,
} from 'n8n-workflow';

export const subredditOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'subreddit',
				],
			},
		},
	},
] as INodeProperties[];

export const subredditFields = [
	// ----------------------------------
	//         subreddit: get
	// ----------------------------------
	{
		displayName: 'Content',
		name: 'content',
		type: 'options',
		required: true,
		default: 'about',
		description: 'Subreddit content to retrieve',
		options: [
			{
				name: 'About',
				value: 'about',
			},
			{
				name: 'Rules',
				value: 'rules',
			},
			{
				name: 'Sidebar',
				value: 'sidebar',
			},
			{
				name: 'Sticky Posts',
				value: 'sticky',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'subreddit',
				],
				operation: [
					'get',
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
		description: 'The name of subreddit to retrieve the content from',
		displayOptions: {
			show: {
				resource: [
					'subreddit',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Return all results',
		displayOptions: {
			show: {
				resource: [
					'subreddit',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 5,
		description: 'The number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				resource: [
					'subreddit',
				],
				operation: [
					'get',
				],
				returnAll: [
					false,
				],
			},
		},
	},
	// ----------------------------------
	//        subreddit: getAll
	// ----------------------------------
	{
		displayName: 'Trending',
		name: 'trending',
		type: 'boolean',
		default: false,
		description: 'Currently trending subreddits in all of Reddit',
		displayOptions: {
			show: {
				resource: [
					'subreddit',
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
		description: 'Return all results',
		displayOptions: {
			show: {
				resource: [
					'subreddit',
				],
				operation: [
					'getAll',
				],
				trending: [
					false,
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 5,
		description: 'The number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				resource: [
					'subreddit',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
				trending: [
					false,
				],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				description: 'The term for the subreddit name search',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'subreddit',
				],
				operation: [
					'getAll',
				],
				trending: [
					false,
				],
			},
		},
	},
] as INodeProperties[];
