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
				name: 'Search',
				value: 'search',
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
				content: [
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
					'subreddit',
				],
				operation: [
					'get',
				],
				content: [
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
] as INodeProperties[];
