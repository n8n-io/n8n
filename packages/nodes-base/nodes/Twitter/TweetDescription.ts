import { INodeProperties } from 'n8n-workflow';

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
				description: 'Create, quote, or reply to a Tweet',
				action: 'Create a Tweet',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a Tweet',
				action: 'Delete a Tweet',
			},
			{
				name: 'Like',
				value: 'like',
				description: 'Like a Tweet',
				action: 'Like a Tweet',
			},
			{
				name: 'Retweet',
				value: 'retweet',
				description: 'Retweet a tweet',
				action: 'Retweet a tweet',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search for Tweets from the last seven days',
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
				displayName: 'Location',
				name: 'locationFieldsUi',
				type: 'fixedCollection',
				placeholder: 'Add Location',
				default: {},
				description: 'Location information for the Tweet',
				options: [
					{
						name: 'locationFieldsValues',
						displayName: 'Location',
						values: [
							{
								displayName: 'Latitude',
								name: 'latitude',
								type: 'string',
								// required: true,
								description: 'The location latitude',
								placeholder: 'e.g. 52.516278',
								default: '',
							},
							{
								displayName: 'Longitude',
								name: 'longitude',
								type: 'string',
								// required: true,
								description: 'The location longitude',
								placeholder: 'e.g. 13.377926',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Media',
				name: 'attachments',
				type: 'string',
				default: '',
				hint: 'The name of the input field containing the binary file data to be attached',
				// required: true,
				// default: 'data',
				placeholder: 'e.g. data',
				description:
					'Name of the binary properties which contain data that should be added to the tweet as an attachment. Multiple attachments should be comma-separated. You may include up to 4 photos or 1 animated GIF or 1 video in a Tweet',
			},

			{
				displayName: 'Quote a Tweet',
				name: 'inQuoteToStatusId',
				type: 'resourceLocator',
				default: { mode: 'id', value: '' },
				// required: true,
				description: 'The Tweet being quoted',
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
				description: 'The Tweet being replied to',
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

	/* -------------------------------------------------------------------------- */
	/*                                tweet:delete                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Tweet',
		name: 'tweetDeleteId',
		type: 'resourceLocator',
		default: { mode: 'id', value: '' },
		required: true,
		description: 'The Tweet to delete',
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
		description: 'The Tweet to like',
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
		// displayName: 'Limit',
		displayName: 'Maximum Returned Tweets',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: ['search'],
				resource: ['tweet'],
				// returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of results to return',
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
				name: 'sortorder',
				type: 'options',
				options: [
					{
						name: 'Recent',
						value: 'recent',
					},
					{
						name: 'Relevant',
						value: 'relevant',
					},
				],
				// required: true,
				description: 'The order in which to return results',
				default: 'recent',
			},
			{
				displayName: 'After',
				name: 'starttime',
				type: 'dateTime',
				default: '',
				description: 'Tweets before this date will not be returned',
			},
			{
				displayName: 'Before',
				name: 'endtime',
				type: 'dateTime',
				default: '',
				description: 'Tweets after this date will not be returned',
			},
			{
				displayName: 'Tweet Fields',
				name: 'tweetfields',
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
					'The fields to add to each returned Tweet object. Default fields are: ID, text, edit_history_tweet_ids.',
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
		description: 'The Tweet to Retweet',
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
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['retweet'],
				resource: ['tweet'],
			},
		},
		options: [
			{
				displayName: 'Trim User',
				name: 'trimUser',
				type: 'boolean',
				default: false,
				description:
					'Whether each tweet returned in a timeline will include a user object including only the status authors numerical ID',
			},
		],
	},
];
