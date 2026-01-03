import type { INodeProperties } from 'n8n-workflow';

export const properties: INodeProperties[] = [
	{
		displayName: 'Messages',
		name: 'messages',
		placeholder: 'Add Message',
		type: 'fixedCollection',
		displayOptions: {
			show: {
				operation: ['chat'],
			},
		},
		typeOptions: {
			multipleValues: true,
		},
		description: 'The messages to generate a completion for',
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
						type: 'options',
						options: [
							{
								name: 'System',
								value: 'system',
							},
							{
								name: 'User',
								value: 'user',
							},
							{
								name: 'Assistant',
								value: 'assistant',
							},
						],
						default: 'user',
						description: 'The role of the author of this message',
					},
					{
						displayName: 'Content',
						name: 'content',
						type: 'string',
						default: '',
						description: 'The contents of the message',
					},
				],
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'messages',
				value: '={{ $value.message }}',
			},
		},
	},
	{
		displayName: 'Simplify Output',
		name: 'simplify',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['chat'],
			},
		},
		default: false,
		description: 'Whether to return only essential fields (ID, citations, message)',
		routing: {
			output: {
				postReceive: [
					{
						type: 'set',
						enabled: '={{ $value }}',
						properties: {
							value:
								'={{ { "id": $response.body?.id, "created": $response.body?.created, "citations": $response.body?.citations || $response.body?.search_results || [], "message": $response.body?.choices?.[0]?.message?.content || $response.body?.content || "", "reasoning_steps": $response.body?.choices?.[0]?.message?.reasoning_steps || $response.body?.reasoning_steps || [], "search_results": $response.body?.search_results || [] } }}',
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
		displayOptions: {
			show: {
				operation: ['chat'],
			},
			hide: {
				proSearch: [true],
			},
		},
		default: false,
		description: 'Whether to stream the response incrementally. Required for Pro Search.',
		routing: {
			send: {
				type: 'body',
				property: 'stream',
				value: '={{ $parameter.proSearch === true ? true : $value }}',
			},
		},
	},
	{
		displayName: 'Stream Response',
		name: 'streamLocked',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['chat'],
				proSearch: [true],
			},
		},
		default: true,
		description: 'Whether streaming is required and automatically enabled when Pro Search is on',
		routing: {
			send: {
				type: 'body',
				property: 'stream',
				value: '={{ true }}',
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['chat'],
			},
		},
		placeholder: 'Add Option',
		default: {},
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
						property: 'frequency_penalty',
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
						property: 'max_tokens',
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
						property: 'temperature',
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
						property: 'top_k',
					},
				},
			},
			{
				displayName: 'Top P',
				name: 'topP',
				type: 'number',
				default: 0.9,
				description:
					'The nucleus sampling parameter, where the model considers the results of the tokens with top_p probability mass. Values are between 0 and 1. We recommend either altering Top K or Top P, but not both.',
				typeOptions: {
					minValue: 0,
					maxValue: 1,
				},
				routing: {
					send: {
						type: 'body',
						property: 'top_p',
					},
				},
			},
			{
				displayName: 'Presence Penalty',
				name: 'presencePenalty',
				type: 'number',
				default: 0,
				description:
					"Values greater than 1.0 penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics",
				routing: {
					send: {
						type: 'body',
						property: 'presence_penalty',
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
						property: 'language_preference',
					},
				},
			},
			{
				displayName: 'Search: Domain Filter',
				name: 'searchDomainFilter',
				type: 'string',
				default: '',
				description:
					'Comma-separated list of domains to filter search results. Use - to exclude (e.g., "-reddit.com").',
				placeholder: 'e.g. domain1,domain2,-domain3',
				routing: {
					send: {
						type: 'body',
						property: 'search_domain_filter',
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
						property: 'search_recency_filter',
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
						property: 'search_mode',
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
						property: 'disable_search',
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
						property: 'enable_search_classifier',
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
						property: 'web_search_options.search_context_size',
					},
				},
			},
			{
				displayName: 'Media: Return Images',
				name: 'returnImages',
				type: 'boolean',
				default: false,
				routing: {
					send: {
						type: 'body',
						property: 'return_images',
					},
				},
			},
			{
				displayName: 'Media: Return Videos',
				name: 'returnVideos',
				type: 'boolean',
				default: false,
				routing: {
					send: {
						type: 'body',
						property: 'media_response.overrides.return_videos',
					},
				},
			},
			{
				displayName: 'Return Related Questions',
				name: 'returnRelatedQuestions',
				type: 'boolean',
				default: false,
				routing: {
					send: {
						type: 'body',
						property: 'return_related_questions',
					},
				},
			},
		],
	},
];
