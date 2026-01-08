import type { INodeProperties } from 'n8n-workflow';

export const properties: INodeProperties[] = [
	{
		displayName: 'Queries',
		name: 'query',
		type: 'fixedCollection',
		displayOptions: {
			show: {
				operation: ['search'],
			},
		},
		typeOptions: {
			multipleValues: true,
			sortable: false,
		},
		placeholder: 'Add Query',
		default: {
			query: [
				{
					text: '',
				},
			],
		},
		description: 'The search query or queries to execute (up to 5 queries)',
		options: [
			{
				displayName: 'Query',
				name: 'query',
				values: [
					{
						displayName: 'Query Text',
						name: 'text',
						type: 'string',
						default: '',
						description: 'The query text to execute',
						required: true,
					},
				],
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'query',
				value:
					'={{ $value.query?.map(q => q.text)?.length === 1 ? $value.query[0].text : $value.query?.map(q => q.text) }}',
			},
		},
	},
	{
		displayName: 'Max Results',
		name: 'maxResults',
		type: 'number',
		default: 10,
		displayOptions: {
			show: {
				operation: ['search'],
			},
		},
		description: 'The maximum number of search results to return (1-20)',
		typeOptions: {
			minValue: 1,
			maxValue: 20,
		},
		routing: {
			send: {
				type: 'body',
				property: 'max_results',
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
				operation: ['search'],
			},
		},
		options: [
			{
				displayName: 'Max Tokens',
				name: 'maxTokens',
				type: 'number',
				default: 25000,
				description:
					'The maximum total number of tokens of webpage content returned across all search results',
				typeOptions: {
					minValue: 1,
					maxValue: 1000000,
				},
				routing: {
					send: {
						type: 'body',
						property: 'max_tokens',
					},
				},
			},
			{
				displayName: 'Max Tokens Per Page',
				name: 'maxTokensPerPage',
				type: 'number',
				default: 2048,
				description:
					'The maximum number of tokens retrieved from each webpage during search processing',
				routing: {
					send: {
						type: 'body',
						property: 'max_tokens_per_page',
					},
				},
			},
			{
				displayName: 'Domain Filter',
				name: 'searchDomainFilter',
				type: 'string',
				default: '',
				description:
					'A list of domains to limit search results to. For denylisting, add a "-" to the beginning of the domain string (e.g., "-domain1"). Maximum 20 domains.',
				placeholder: 'e.g. science.org, pnas.org, -reddit.com',
				routing: {
					send: {
						type: 'body',
						property: 'search_domain_filter',
						value:
							'={{ $value ? $value.split(",").map(domain => domain.trim()).filter(domain => domain) : undefined }}',
					},
				},
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				description:
					'Country code to filter search results by geographic location (e.g., "US", "GB", "DE")',
				placeholder: 'e.g. US',
				routing: {
					send: {
						type: 'body',
						property: 'country',
					},
				},
			},
			{
				displayName: 'Recency Filter',
				name: 'searchRecencyFilter',
				type: 'options',
				options: [
					{
						name: 'Day',
						value: 'day',
					},
					{
						name: 'Week',
						value: 'week',
					},
					{
						name: 'Month',
						value: 'month',
					},
					{
						name: 'Year',
						value: 'year',
					},
				],
				default: 'month',
				description: 'Filters search results based on recency',
				routing: {
					send: {
						type: 'body',
						property: 'search_recency_filter',
					},
				},
			},
			{
				displayName: 'After Date',
				name: 'searchAfterDate',
				type: 'string',
				default: '',
				description:
					'Filters search results to only include content published after this date (MM/DD/YYYY format)',
				placeholder: 'e.g. 01/15/2024',
				routing: {
					send: {
						type: 'body',
						property: 'search_after_date',
					},
				},
			},
			{
				displayName: 'Before Date',
				name: 'searchBeforeDate',
				type: 'string',
				default: '',
				description:
					'Filters search results to only include content published before this date (MM/DD/YYYY format)',
				placeholder: 'e.g. 12/31/2024',
				routing: {
					send: {
						type: 'body',
						property: 'search_before_date',
					},
				},
			},
			{
				displayName: 'Language Filter',
				name: 'searchLanguageFilter',
				type: 'string',
				default: '',
				description:
					'A list of language codes to filter search results by (ISO 639-1 codes). Maximum 10 languages.',
				placeholder: 'e.g. en, fr, de',
				routing: {
					send: {
						type: 'body',
						property: 'search_language_filter',
						value:
							'={{ $value ? $value.split(",").map(lang => lang.trim()).filter(lang => lang) : undefined }}',
					},
				},
			},
		],
	},
	{
		displayName: 'Simplify Output',
		name: 'simplify',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: ['search'],
			},
		},
		description: 'Whether to return only essential fields (results with title, URL, snippet, date)',
		routing: {
			output: {
				postReceive: [
					{
						type: 'set',
						enabled: '={{ $value }}',
						properties: {
							value:
								'={{ { "results": $response.body?.results?.map(r => ({ title: r.title, url: r.url, snippet: r.snippet, date: r.date, last_updated: r.last_updated })) } }}',
						},
					},
				],
			},
		},
	},
];
