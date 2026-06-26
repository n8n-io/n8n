import type { INodeProperties } from 'n8n-workflow';

export const accountOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['account'],
			},
		},
		options: [
			{
				name: 'Get Balance',
				value: 'getBalance',
				description: 'Query the current account balance',
				action: 'Get account balance',
			},
			{
				name: 'Get Pricing',
				value: 'getPricing',
				description: 'Retrieve current SMS pricing by country and network',
				action: 'Get SMS pricing',
			},
			{
				name: 'Get Analytics',
				value: 'getAnalytics',
				description: 'Retrieve detailed usage statistics',
				action: 'Get usage analytics',
			},
		],
		default: 'getBalance',
	},
];

export const accountFields: INodeProperties[] = [
	{
		displayName: 'Country',
		name: 'country',
		type: 'string',
		default: '',
		placeholder: 'DE',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['getPricing'],
			},
		},
		description: 'ISO 3166-1 alpha-2 country code. Empty returns all countries.',
	},
	{
		displayName: 'Format',
		name: 'format',
		type: 'options',
		options: [
			{ name: 'JSON', value: 'json' },
			{ name: 'CSV', value: 'csv' },
		],
		default: 'json',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['getPricing'],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['getAnalytics'],
			},
		},
		options: [
			{
				displayName: 'Start Date',
				name: 'start',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'Begin date. Defaults to 30 days prior.',
			},
			{
				displayName: 'End Date',
				name: 'end',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'End date. Defaults to today.',
			},
			{
				displayName: 'Label',
				name: 'label',
				type: 'string',
				default: '',
				description: 'Filter by label or "all"',
			},
			{
				displayName: 'Subaccounts',
				name: 'subaccounts',
				type: 'string',
				default: 'only_main',
				description: '"only_main", "all", or specific subaccount ID',
			},
			{
				displayName: 'Group By',
				name: 'group_by',
				type: 'options',
				options: [
					{ name: 'Date', value: 'date' },
					{ name: 'Label', value: 'label' },
					{ name: 'Subaccount', value: 'subaccount' },
					{ name: 'Country', value: 'country' },
				],
				default: 'date',
			},
		],
	},
];
