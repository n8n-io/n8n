import type { INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

const properties: INodeProperties[] = [
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		required: true,
		default: '',
		description: 'The search query string',
		routing: {
			send: {
				type: 'body',
				property: 'query',
			},
		},
	},
	{
		displayName: 'Simplify Output',
		name: 'simplify',
		type: 'boolean',
		default: false,
		description: 'Whether to return only the ID and results array',
		routing: {
			output: {
				postReceive: [
					{
						type: 'set',
						enabled: '={{ $value }}',
						properties: {
							value: '={{ { "id": $response.body?.id, "results": $response.body?.results } }}',
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
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				placeholder: 'e.g. us',
				description: '2-character ISO 3166-1 alpha-2 country code to localize search results',
				routing: {
					send: {
						type: 'body',
						property: 'country',
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
				routing: {
					send: {
						type: 'body',
						property: 'last_updated_before_filter',
					},
				},
			},
			{
				displayName: 'Max Results',
				name: 'maxResults',
				type: 'number',
				default: 10,
				typeOptions: { minValue: 1, maxValue: 20 },
				description: 'Maximum number of search results to return (1-20)',
				routing: {
					send: {
						type: 'body',
						property: 'max_results',
					},
				},
			},
			{
				displayName: 'Max Tokens',
				name: 'maxTokens',
				type: 'number',
				default: 10000,
				typeOptions: { minValue: 1, maxValue: 1000000 },
				description: 'Maximum number of tokens in the response',
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
				default: 4096,
				typeOptions: { minValue: 1, maxValue: 1000000 },
				description: 'Maximum number of tokens per page of results',
				routing: {
					send: {
						type: 'body',
						property: 'max_tokens_per_page',
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
				placeholder: 'e.g. domain1.com,domain2.com',
				description: 'Comma-separated list of domains to limit search results to (max 20)',
				routing: {
					send: {
						type: 'body',
						property: 'search_domain_filter',
						value: '={{ $value.split(",").map(s => s.trim()).filter(s => s) }}',
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
				routing: {
					send: {
						type: 'body',
						property: 'search_language_filter',
						value: '={{ $value.split(",").map(s => s.trim()).filter(s => s) }}',
					},
				},
			},
			{
				displayName: 'Search Recency Filter',
				name: 'searchRecencyFilter',
				type: 'options',
				options: [
					{ name: 'Day', value: 'day' },
					{ name: 'Hour', value: 'hour' },
					{ name: 'Month', value: 'month' },
					{ name: 'Week', value: 'week' },
					{ name: 'Year', value: 'year' },
				],
				default: 'month',
				description: 'Filter search results by publication recency',
				routing: {
					send: {
						type: 'body',
						property: 'search_recency_filter',
					},
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['search'],
		operation: ['search'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
