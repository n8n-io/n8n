import {
	INodeProperties,
} from 'n8n-workflow';

export const listingOperations = [
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
		],
		displayOptions: {
			show: {
				resource: [
					'listing',
				],
			},
		},
	},
] as INodeProperties[];

export const listingFields = [
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		default: 'trending',
		description: 'Type of listing to retrieve',
		options: [
			{
				name: 'Trending',
				value: 'trending',
				description: 'Currently trending subreddits',
			},
			{
				name: 'Best',
				value: 'best',
				description: 'Top posts in all of Reddit',
			},
			{
				name: 'Top',
				value: 'top',
				description: 'Top posts in a specifc subreddit',
			},
			{
				name: 'Hot',
				value: 'hot',
				description: 'Hot posts in a specifc subreddit',
			},
			{
				name: 'New',
				value: 'new',
				description: 'New posts in a specifc subreddit',
			},
			{
				name: 'Rising',
				value: 'rising',
				description: 'Rising posts in a specifc subreddit',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'listing',
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
					'listing',
				],
				operation: [
					'get',
				],
				type: [
					'best',
					'top',
					'hot',
					'new',
					'rising',
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
					'listing',
				],
				operation: [
					'get',
				],
				type: [
					'best',
					'top',
					'hot',
					'new',
					'rising',
				],
				returnAll: [
					false,
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
		description: 'The subreddit to retrieve the listing from',
		displayOptions: {
			show: {
				resource: [
					'listing',
				],
				operation: [
					'get',
				],
				type: [
					'top',
					'hot',
					'new',
					'rising',
				],
			},
		},
	},
] as INodeProperties[];
