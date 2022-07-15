import {
	INodeProperties,
} from 'n8n-workflow';

export const urlOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'url',
				],
			},
		},
		options: [
			{
				name: 'Expand',
				value: 'expand',
				description: 'Expand a URL',
				action: 'Expand a URL',
			},
			{
				name: 'Shorten',
				value: 'shorten',
				description: 'Shorten a URL',
				action: 'Shorten a URL',
			},
			{
				name: 'Stats',
				value: 'stats',
				description: 'Get stats about one short URL',
				action: 'Get stats for a URL',
			},
		],
		default: 'shorten',
	},
];

export const urlFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                url:shorten                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'url',
				],
				operation: [
					'shorten',
				],
			},
		},
		default: '',
		description: 'The URL to shorten',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'url',
				],
				operation: [
					'shorten',
				],
			},
		},
		options: [
			{
				displayName: 'Keyword',
				name: 'keyword',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Title for custom short URLs',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                url:expand                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Short URL',
		name: 'shortUrl',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'url',
				],
				operation: [
					'expand',
				],
			},
		},
		default: '',
		description: 'The short URL to expand',
	},

	/* -------------------------------------------------------------------------- */
	/*                                url:stats                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Short URL',
		name: 'shortUrl',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'url',
				],
				operation: [
					'stats',
				],
			},
		},
		default: '',
		description: 'The short URL for which to get stats',
	},
];
