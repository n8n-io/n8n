import type { INodeProperties } from 'n8n-workflow';

export const tweetOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['tweet'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create, quote, or reply to a tweet',
				action: 'Create Tweet',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a tweet',
				action: 'Delete Tweet',
			},
			{
				name: 'Like',
				value: 'like',
				description: 'Like a tweet',
				action: 'Like Tweet',
			},
			{
				name: 'Retweet',
				value: 'retweet',
				description: 'Retweet a tweet',
				action: 'Retweet Tweet',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search for tweets from the last seven days',
				action: 'Search Tweets',
			},
		],
		default: 'create',
	},
];

export const tweetFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                tweet:create                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: {
			rows: 2,
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['tweet'],
			},
		},
		description:
			'The text of the status update. URLs must be encoded. Links wrapped with the t.co shortener will affect character count',
	},
	{
		displayName: 'Options',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['tweet'],
			},
		},
		options: [
			{
				displayName: 'Location ID',
				name: 'location',
				type: 'string',
				placeholder: '4e696bef7e24d378',
				default: '',
				description: 'Location information for the tweet',
			},
			{
				displayName: 'Media ID',
				name: 'attachments',
				type: 'string',
				default: '',
				placeholder: '1664279886239010824',
				description: 'The attachment ID to associate with the message',
			},
			{
				displayName: 'Quote a Tweet',
				name: 'inQuoteToStatusId',
				type: 'resourceLocator',
				default: { mode: 'id', value: '' },
				description: 'The tweet being quoted',
				modes: [
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						validation: [],
						placeholder: 'e.g. 1187836157394112513',
						url: '',
					},
					{
						displayName: 'By URL',
						name: 'url',
						type: 'string',
						validation: [],
						placeholder: 'e.g. https://twitter.com/n8n_io/status/1187836157394112513',
						url: '',
					},
				],
			},
			{
				displayName: 'Reply to Tweet',
				name: 'inReplyToStatusId',
				type: 'resourceLocator',
				default: { mode: 'id', value: '' },
				// required: true,
				description: 'The tweet being replied to',
				modes: [
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						validation: [],
						placeholder: 'e.g. 1187836157394112513',
						url: '',
					},
					{
						displayName: 'By URL',
						name: 'url',
						type: 'string',
						validation: [],
						placeholder: 'e.g. https://twitter.com/n8n_io/status/1187836157394112513',
						url: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Locations are not supported due to Twitter V2 API limitations',
		name: 'noticeLocation',
		type: 'notice',
		displayOptions: {
			show: {
				'/additionalFields.location': [''],
			},
		},
		default: '',
	},
	{
		displayName: 'Attachements are not supported due to Twitter V2 API limitations',
		name: 'noticeAttachments',
		type: 'notice',
		displayOptions: {
			show: {
				'/additionalFields.attachments': [''],
			},
		},
		default: '',
	},

	/* -------------------------------------------------------------------------- */
	/*                                tweet:delete                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Tweet',
		name: 'tweetDeleteId',
		type: 'resourceLocator',
		default: { mode: 'id', value: '' },
		required: true,
		description: 'The tweet to delete',
		displayOptions: {
			show: {
				resource: ['tweet'],
				operation: ['delete'],
			},
		},
		modes: [
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				validation: [],
				placeholder: 'e.g. 1187836157394112513',
				url: '',
			},
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				validation: [],
				placeholder: 'e.g. https://twitter.com/n8n_io/status/1187836157394112513',
				url: '',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                tweet:like                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Tweet',
		name: 'tweetId',
		type: 'resourceLocator',
		default: { mode: 'id', value: '' },
		required: true,
		description: 'The tweet to like',
		displayOptions: {
			show: {
				operation: ['like'],
				resource: ['tweet'],
			},
		},
		modes: [
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				validation: [],
				placeholder: 'e.g. 1187836157394112513',
				url: '',
			},
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				validation: [],
				placeholder: 'e.g. https://twitter.com/n8n_io/status/1187836157394112513',
				url: '',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                tweet:search                                */
	/* -------------------------------------------------------------------------- */
	{
		// displayName: 'Search Text',
		displayName: 'Search Term',
		name: 'searchText',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. automation',
		displayOptions: {
			show: {
				operation: ['search'],
				resource: ['tweet'],
			},
		},
		description:
			'A UTF-8, URL-encoded search query of 500 characters maximum, including operators. Queries may additionally be limited by complexity. Check the searching examples <a href="https://developer.twitter.com/en/docs/tweets/search/guides/standard-operators">here</a>.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['tweet'],
				operation: ['search'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['tweet'],
				operation: ['search'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['search'],
				resource: ['tweet'],
			},
		},
		options: [
			{
				displayName: 'Sort Order',
				name: 'sortOrder',
				type: 'options',
				options: [
					{
						name: 'Recent',
						value: 'recency',
					},
					{
						name: 'Relevant',
						value: 'relevancy',
					},
				],
				// required: true,
				description: 'The order in which to return results',
				default: 'recency',
			},
			{
				displayName: 'After',
				name: 'startTime',
				type: 'dateTime',
				default: '',
				description:
					"Tweets before this date will not be returned. This date must be within the last 7 days if you don't have Academic Research access.",
			},
			{
				displayName: 'Before',
				name: 'endTime',
				type: 'dateTime',
				default: '',
				description:
					"Tweets after this date will not be returned. This date must be within the last 7 days if you don't have Academic Research access.",
			},
			{
				displayName: 'Tweet Fields',
				name: 'tweetFieldsObject',
				type: 'multiOptions',
				// eslint-disable-next-line n8n-nodes-base/node-param-multi-options-type-unsorted-items
				options: [
					{
						name: 'Attachments',
						value: 'attachments',
					},
					{
						name: 'Author ID',
						value: 'author_id',
					},
					{
						name: 'Context Annotations',
						value: 'context_annotations',
					},
					{
						name: 'Conversation ID',
						value: 'conversation_id',
					},
					{
						name: 'Created At',
						value: 'created_at',
					},
					{
						name: 'Edit Controls',
						value: 'edit_controls',
					},
					{
						name: 'Entities',
						value: 'entities',
					},
					{
						name: 'Geo',
						value: 'geo',
					},
					{
						name: 'ID',
						value: 'id',
					},
					{
						name: 'In Reply To User ID',
						value: 'in_reply_to_user_id',
					},
					{
						name: 'Lang',
						value: 'lang',
					},
					{
						name: 'Non Public Metrics',
						value: 'non_public_metrics',
					},
					{
						name: 'Public Metrics',
						value: 'public_metrics',
					},
					{
						name: 'Organic Metrics',
						value: 'organic_metrics',
					},
					{
						name: 'Promoted Metrics',
						value: 'promoted_metrics',
					},
					{
						name: 'Possibly Sensitive',
						value: 'possibly_sensitive',
					},
					{
						name: 'Referenced Tweets',
						value: 'referenced_tweets',
					},
					{
						name: 'Reply Settings',
						value: 'reply_settings',
					},
					{
						name: 'Source',
						value: 'source',
					},
					{
						name: 'Text',
						value: 'text',
					},
					{
						name: 'Withheld',
						value: 'withheld',
					},
				],
				default: [],
				description:
					'The fields to add to each returned tweet object. Default fields are: ID, text, edit_history_tweet_ids.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                tweet:retweet                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Tweet',
		name: 'tweetId',
		type: 'resourceLocator',
		default: { mode: 'id', value: '' },
		required: true,
		description: 'The tweet to retweet',
		displayOptions: {
			show: {
				operation: ['retweet'],
				resource: ['tweet'],
			},
		},
		modes: [
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				validation: [],
				placeholder: 'e.g. 1187836157394112513',
				url: '',
			},
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				validation: [],
				placeholder: 'e.g. https://twitter.com/n8n_io/status/1187836157394112513',
				url: '',
			},
		],
	},
];
