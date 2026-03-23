import type { INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

const properties: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		default: 'sonar',
		required: true,
		options: [
			{ name: 'Sonar', value: 'sonar' },
			{ name: 'Sonar Deep Research', value: 'sonar-deep-research' },
			{ name: 'Sonar Pro', value: 'sonar-pro' },
			{ name: 'Sonar Reasoning Pro', value: 'sonar-reasoning-pro' },
		],
		description: 'The model which will generate the completion',
		routing: {
			send: {
				type: 'body',
				property: 'model',
			},
		},
	},
	{
		displayName: 'Messages',
		name: 'messages',
		type: 'fixedCollection',
		description:
			'Any optional system messages must be sent first, followed by alternating user and assistant messages',
		required: true,
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
						displayName: 'Text',
						name: 'content',
						type: 'string',
						default: '',
						description: 'The content of the message to be sent',
						typeOptions: {
							rows: 2,
						},
					},
					{
						displayName: 'Role',
						name: 'role',
						required: true,
						type: 'options',
						options: [
							{
								name: 'Assistant',
								value: 'assistant',
								description:
									'Tell the model to adopt a specific tone or personality. Must alternate with user messages.',
							},
							{
								name: 'System',
								value: 'system',
								description:
									'Set the models behavior or context. Must come before user and assistant messages.',
							},
							{
								name: 'User',
								value: 'user',
								description: 'Send a message as a user and get a response from the model',
							},
						],
						default: 'user',
						description:
							"Role in shaping the model's response, it tells the model how it should behave and interact with the user",
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
								'={{ { "id": $response.body?.id, "created": $response.body?.created, "citations": $response.body?.citations, "message": $response.body?.choices?.[0]?.message?.content } }}',
						},
					},
				],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Disable Search',
				name: 'disableSearch',
				type: 'boolean',
				default: false,
				description: 'Whether to disable web search for this request',
				displayOptions: {
					show: {
						'@version': [2],
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'disable_search',
					},
				},
			},
			{
				displayName: 'Enable Search Classifier',
				name: 'enableSearchClassifier',
				type: 'boolean',
				default: false,
				description: 'Whether to enable the search classifier',
				displayOptions: {
					show: {
						'@version': [2],
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'enable_search_classifier',
					},
				},
			},
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
				displayName: 'Image Domain Filter',
				name: 'imageDomainFilter',
				type: 'string',
				default: '',
				placeholder: 'e.g. domain1.com,domain2.com',
				description: 'Comma-separated list of domains to filter image results from',
				displayOptions: {
					show: {
						'@version': [2],
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'image_domain_filter',
						value: '={{ $value.split(",").map(s => s.trim()).filter(s => s) }}',
					},
				},
			},
			{
				displayName: 'Image Format Filter',
				name: 'imageFormatFilter',
				type: 'string',
				default: '',
				placeholder: 'e.g. jpg,png',
				description: 'Comma-separated list of image formats to filter results by',
				displayOptions: {
					show: {
						'@version': [2],
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'image_format_filter',
						value: '={{ $value.split(",").map(s => s.trim()).filter(s => s) }}',
					},
				},
			},
			{
				displayName: 'Language Preference',
				name: 'languagePreference',
				type: 'string',
				default: '',
				placeholder: 'e.g. en',
				description: 'ISO 639-1 language code for the response language preference',
				displayOptions: {
					show: {
						'@version': [2],
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'language_preference',
					},
				},
			},
			{
				displayName: 'Last Updated After',
				name: 'lastUpdatedAfter',
				type: 'string',
				default: '',
				placeholder: 'e.g. 01/01/2024',
				description: 'Filter results last updated after this date (MM/DD/YYYY)',
				displayOptions: {
					show: {
						'@version': [2],
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'last_updated_after_filter',
					},
				},
			},
			{
				displayName: 'Last Updated Before',
				name: 'lastUpdatedBefore',
				type: 'string',
				default: '',
				placeholder: 'e.g. 12/31/2024',
				description: 'Filter results last updated before this date (MM/DD/YYYY)',
				displayOptions: {
					show: {
						'@version': [2],
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'last_updated_before_filter',
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
						property: 'presence_penalty',
					},
				},
			},
			{
				displayName: 'Reasoning Effort',
				name: 'reasoningEffort',
				type: 'options',
				options: [
					{ name: 'Minimal', value: 'minimal' },
					{ name: 'Low', value: 'low' },
					{ name: 'Medium', value: 'medium' },
					{ name: 'High', value: 'high' },
				],
				default: 'medium',
				description: 'The level of reasoning effort to apply',
				displayOptions: {
					show: {
						'@version': [2],
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'reasoning_effort',
					},
				},
			},
			{
				displayName: 'Response Format',
				name: 'responseFormat',
				type: 'json',
				default: '',
				description:
					'JSON schema for structured output. Set type to "json_schema" with a schema property.',
				displayOptions: {
					show: {
						'@version': [2],
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'response_format',
						value: '={{ JSON.parse($value) }}',
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
						property: 'return_images',
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
						property: 'return_related_questions',
					},
				},
			},
			{
				displayName: 'Search After Date',
				name: 'searchAfterDate',
				type: 'string',
				default: '',
				placeholder: 'e.g. 01/01/2024',
				description: 'Filter results published after this date (MM/DD/YYYY)',
				displayOptions: {
					show: {
						'@version': [2],
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'search_after_date_filter',
					},
				},
			},
			{
				displayName: 'Search Before Date',
				name: 'searchBeforeDate',
				type: 'string',
				default: '',
				placeholder: 'e.g. 12/31/2024',
				description: 'Filter results published before this date (MM/DD/YYYY)',
				displayOptions: {
					show: {
						'@version': [2],
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'search_before_date_filter',
					},
				},
			},
			{
				displayName: 'Search Domain Filter',
				name: 'searchDomainFilter',
				type: 'string',
				default: '',
				description:
					'Limit the citations used by the online model to URLs from the specified domains. For blacklisting, add a <code>-</code> to the beginning of the domain string (e.g., <code>-domain1</code>). Currently limited to 3 domains. Requires Perplexity API usage Tier-3.',
				placeholder: 'e.g. domain1,domain2,-domain3',
				routing: {
					send: {
						type: 'body',
						property: 'search_domain_filter',
						value: '={{ $value.split(",").map(domain => domain.trim()) }}',
					},
				},
			},
			{
				displayName: 'Search Language Filter',
				name: 'searchLanguageFilter',
				type: 'string',
				default: '',
				placeholder: 'e.g. en,fr,de',
				description:
					'Comma-separated list of ISO 639-1 language codes to filter results by (max 20)',
				displayOptions: {
					show: {
						'@version': [2],
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'search_language_filter',
						value: '={{ $value.split(",").map(s => s.trim()).filter(s => s) }}',
					},
				},
			},
			{
				displayName: 'Search Mode',
				name: 'searchMode',
				type: 'options',
				options: [
					{ name: 'Web', value: 'web' },
					{ name: 'Academic', value: 'academic' },
					{ name: 'SEC', value: 'sec' },
				],
				default: 'web',
				description: 'The search mode to use for retrieving information',
				displayOptions: {
					show: {
						'@version': [2],
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'search_mode',
					},
				},
			},
			{
				displayName: 'Search Recency Filter',
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
				displayName: 'Stop Sequences',
				name: 'stop',
				type: 'string',
				default: '',
				placeholder: 'e.g. stop1,stop2',
				description: 'Comma-separated list of sequences where the model should stop generating',
				displayOptions: {
					show: {
						'@version': [2],
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'stop',
						value: '={{ $value.split(",").map(s => s.trim()).filter(s => s) }}',
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
					'The nucleus sampling threshold, valued between 0 and 1 inclusive. For each subsequent token, the model considers the results of the tokens with Top P probability mass. We recommend either altering Top K or Top P, but not both.',
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
				displayName: 'Web Search Options',
				name: 'webSearchOptions',
				type: 'json',
				default: '',
				description: 'Advanced web search configuration object',
				displayOptions: {
					show: {
						'@version': [2],
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'web_search_options',
						value: '={{ JSON.parse($value) }}',
					},
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['chat'],
		operation: ['complete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
