import type { INodeProperties } from 'n8n-workflow';

export const properties: INodeProperties[] = [
	{
		displayName: 'Messages',
		name: 'messages',
		type: 'fixedCollection',
		description: 'Messages for the conversation',
		required: true,
		displayOptions: {
			show: {
				operation: ['asyncCreate'],
			},
		},
		typeOptions: {
			multipleValues: true,
			sortable: true,
		},
		placeholder: 'Add Message',
		default: {
			message: [
				{
					role: 'user',
					content: '',
				},
			],
		},
		options: [
			{
				displayName: 'Message',
				name: 'message',
				values: [
					{
						displayName: 'Role',
						name: 'role',
						required: true,
						type: 'options',
						options: [
							{ name: 'System', value: 'system' },
							{ name: 'User', value: 'user' },
							{ name: 'Assistant', value: 'assistant' },
						],
						default: 'user',
					},
					{
						displayName: 'Content',
						name: 'content',
						type: 'string',
						default: '',
						description: 'The content of the message',
						required: true,
					},
				],
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'request.messages',
				value: '={{ $value.message }}',
			},
		},
	},
	{
		displayName: 'Simplify Output',
		name: 'simplify',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: ['asyncCreate'],
			},
		},
		description: 'Whether to return only essential fields (ID, model, status, created_at)',
		routing: {
			output: {
				postReceive: [
					{
						type: 'set',
						enabled: '={{ $value }}',
						properties: {
							value:
								'={{ { id: $response.body?.id, model: $response.body?.model, status: $response.body?.status, created_at: $response.body?.created_at } }}',
						},
					},
				],
			},
		},
	},
	{
		displayName: 'Stream Response',
		name: 'stream',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: ['asyncCreate'],
			},
			hide: {
				proSearch: [true],
			},
		},
		description: 'Whether to stream the response incrementally. Required for Pro Search.',
		routing: {
			send: {
				type: 'body',
				property: 'request.stream',
				value: '={{ $parameter.proSearch === true ? true : $value }}',
			},
		},
	},
	{
		displayName: 'Stream Response',
		name: 'streamLocked',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				operation: ['asyncCreate'],
				proSearch: [true],
			},
		},
		description: 'Whether streaming is required and automatically enabled when Pro Search is on',
		routing: {
			send: {
				type: 'body',
				property: 'request.stream',
				value: '={{ true }}',
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: ['asyncCreate'],
			},
		},
		options: [
			{
				displayName: 'Frequency Penalty',
				name: 'frequencyPenalty',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description:
					"Values greater than 1.0 penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim",
				routing: {
					send: {
						type: 'body',
						property: 'request.frequency_penalty',
					},
				},
			},
			{
				displayName: 'Maximum Number of Tokens',
				name: 'maxTokens',
				type: 'number',
				default: 1,
				description:
					'The maximum number of tokens to generate in the completion. The number of tokens requested plus the number of prompt tokens sent in messages must not exceed the context window token limit of model requested.',
				routing: {
					send: {
						type: 'body',
						property: 'request.max_tokens',
					},
				},
			},
			{
				displayName: 'Output Randomness (Temperature)',
				name: 'temperature',
				type: 'number',
				default: 0.2,
				description:
					'The amount of randomness in the response, valued between 0 inclusive and 2 exclusive. Higher values are more random, and lower values are more deterministic.',
				typeOptions: {
					minValue: 0,
					maxValue: 1.99,
				},
				routing: {
					send: {
						type: 'body',
						property: 'request.temperature',
					},
				},
			},
			{
				displayName: 'Top K',
				name: 'topK',
				type: 'number',
				default: 0,
				description:
					'The number of tokens to keep for highest Top K filtering, specified as an integer between 0 and 2048 inclusive. If set to 0, Top K filtering is disabled. We recommend either altering Top K or Top P, but not both.',
				typeOptions: {
					minValue: 0,
					maxValue: 2048,
				},
				routing: {
					send: {
						type: 'body',
						property: 'request.top_k',
					},
				},
			},
			{
				displayName: 'Top P',
				name: 'topP',
				type: 'number',
				default: 0.9,
				description:
					'The nucleus sampling threshold, valued between 0 and 1 inclusive. For each subsequent token, the model considers the results of the tokens with Top P probability mass. We recommend either altering Top K or Top P, but not both.',
				typeOptions: {
					minValue: 0,
					maxValue: 1,
				},
				routing: {
					send: {
						type: 'body',
						property: 'request.top_p',
					},
				},
			},
			{
				displayName: 'Presence Penalty',
				name: 'presencePenalty',
				type: 'number',
				default: 0,
				description:
					"A value between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics.",
				typeOptions: {
					minValue: -2.0,
					maxValue: 2.0,
				},
				routing: {
					send: {
						type: 'body',
						property: 'request.presence_penalty',
					},
				},
			},
			{
				displayName: 'Return Images',
				name: 'returnImages',
				type: 'boolean',
				default: false,
				description:
					'Whether or not a request to an online model should return images. Requires Perplexity API usage Tier-2.',
				routing: {
					send: {
						type: 'body',
						property: 'request.return_images',
					},
				},
			},
			{
				displayName: 'Return Related Questions',
				name: 'returnRelatedQuestions',
				type: 'boolean',
				default: false,
				description:
					'Whether or not a request to an online model should return related questions. Requires Perplexity API usage Tier-2.',
				routing: {
					send: {
						type: 'body',
						property: 'request.return_related_questions',
					},
				},
			},
			{
				displayName: 'Search: Domain Filter',
				name: 'searchDomainFilter',
				type: 'string',
				default: '',
				description:
					'Limit the citations used by the online model to URLs from the specified domains. For blacklisting, add a <code>-</code> to the beginning of the domain string (e.g., <code>-domain1</code>). Maximum 20 domains. Requires Perplexity API usage Tier-2+.',
				placeholder: 'e.g. domain1,domain2,-domain3',
				routing: {
					send: {
						type: 'body',
						property: 'request.search_domain_filter',
						value:
							'={{ typeof $value === "string" && $value ? $value.split(",").map(domain => domain.trim()).filter(domain => domain) : $value }}',
					},
				},
			},
			{
				displayName: 'Search: Recency Filter',
				name: 'searchRecency',
				type: 'options',
				options: [
					{ name: 'Day', value: 'day' },
					{ name: 'Hour', value: 'hour' },
					{ name: 'Month', value: 'month' },
					{ name: 'Week', value: 'week' },
					{ name: 'Year', value: 'year' },
				],
				default: 'month',
				description: 'Returns search results within the specified time interval',
				routing: {
					send: {
						type: 'body',
						property: 'request.search_recency_filter',
					},
				},
			},
			{
				displayName: 'Search: Mode',
				name: 'searchMode',
				type: 'options',
				options: [
					{ name: 'Academic', value: 'academic', description: 'Prioritizes scholarly sources' },
					{ name: 'SEC', value: 'sec', description: 'Prioritizes SEC filings' },
					{ name: 'Web', value: 'web', description: 'Uses general web search' },
				],
				default: 'web',
				description: 'Controls search mode for web results',
				routing: {
					send: {
						type: 'body',
						property: 'request.search_mode',
					},
				},
			},
			{
				displayName: 'Language Preference',
				name: 'languagePreference',
				type: 'string',
				default: '',
				description:
					'Preferred language for the response content (e.g., English, Korean, Spanish). Supported by sonar and sonar-pro models.',
				placeholder: 'e.g. English',
				routing: {
					send: {
						type: 'body',
						property: 'request.language_preference',
					},
				},
			},
			{
				displayName: 'Search: Disable Search',
				name: 'disableSearch',
				type: 'boolean',
				default: false,
				description:
					'Whether to disable web search completely and use only training data to respond',
				routing: {
					send: {
						type: 'body',
						property: 'request.disable_search',
					},
				},
			},
			{
				displayName: 'Search: Enable Search Classifier',
				name: 'enableSearchClassifier',
				type: 'boolean',
				default: false,
				description:
					'Whether to enable classifier that decides if web search is needed based on the query',
				routing: {
					send: {
						type: 'body',
						property: 'request.enable_search_classifier',
					},
				},
			},
			{
				displayName: 'Web Search: Context Size',
				name: 'searchContextSize',
				type: 'options',
				options: [
					{ name: 'Low', value: 'low' },
					{ name: 'Medium', value: 'medium' },
					{ name: 'High', value: 'high' },
				],
				default: 'low',
				routing: {
					send: {
						type: 'body',
						property: 'request.web_search_options.search_context_size',
					},
				},
			},
			{
				displayName: 'Web Search: Image Search Relevance Enhanced',
				name: 'imageSearchRelevanceEnhanced',
				type: 'boolean',
				default: false,
				description: 'Whether to improve relevance of image search results to the query',
				routing: {
					send: {
						type: 'body',
						property: 'request.web_search_options.image_search_relevance_enhanced',
					},
				},
			},
			{
				displayName: 'Media: Return Videos',
				name: 'returnVideos',
				type: 'boolean',
				default: false,
				description: 'Whether to enable video content in responses',
				routing: {
					send: {
						type: 'body',
						property: 'request.media_response.overrides.return_videos',
					},
				},
			},
			{
				displayName: 'Media: Return Images Override',
				name: 'returnImagesOverride',
				type: 'boolean',
				default: false,
				description: 'Whether to override top-level return_images parameter',
				routing: {
					send: {
						type: 'body',
						property: 'request.media_response.overrides.return_images',
					},
				},
			},
			{
				displayName: 'Search After Date',
				name: 'searchAfterDateFilter',
				type: 'string',
				default: '',
				description: 'Filter citations to content published after this date (MM/DD/YYYY format)',
				placeholder: '01/15/2024',
				routing: {
					send: {
						type: 'body',
						property: 'request.search_after_date_filter',
					},
				},
			},
			{
				displayName: 'Search Before Date',
				name: 'searchBeforeDateFilter',
				type: 'string',
				default: '',
				description: 'Filter citations to content published before this date (MM/DD/YYYY format)',
				placeholder: '12/31/2024',
				routing: {
					send: {
						type: 'body',
						property: 'request.search_before_date_filter',
					},
				},
			},
			{
				displayName: 'Last Updated After',
				name: 'lastUpdatedAfterFilter',
				type: 'string',
				default: '',
				description: 'Filter citations to content last updated after this date (MM/DD/YYYY format)',
				placeholder: '01/15/2024',
				routing: {
					send: {
						type: 'body',
						property: 'request.last_updated_after_filter',
					},
				},
			},
			{
				displayName: 'Last Updated Before',
				name: 'lastUpdatedBeforeFilter',
				type: 'string',
				default: '',
				description:
					'Filter citations to content last updated before this date (MM/DD/YYYY format)',
				placeholder: '12/31/2024',
				routing: {
					send: {
						type: 'body',
						property: 'request.last_updated_before_filter',
					},
				},
			},
		],
	},
];
