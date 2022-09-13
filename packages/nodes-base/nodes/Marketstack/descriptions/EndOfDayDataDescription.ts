import { INodeProperties } from 'n8n-workflow';

export const endOfDayDataOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many EoD data',
			},
		],
		default: 'getAll',
		displayOptions: {
			show: {
				resource: ['endOfDayData'],
			},
		},
	},
];

export const endOfDayDataFields: INodeProperties[] = [
	{
		displayName: 'Ticker',
		name: 'symbols',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['endOfDayData'],
				operation: ['getAll'],
			},
		},
		default: '',
		description:
			'One or multiple comma-separated stock symbols (tickers) to retrieve, e.g. <code>AAPL</code> or <code>AAPL,MSFT</code>',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['endOfDayData'],
				operation: ['getAll'],
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
				resource: ['endOfDayData'],
				operation: ['getAll'],
				returnAll: [false],
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
				resource: ['endOfDayData'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Exchange',
				name: 'exchange',
				type: 'string',
				default: '',
				description:
					'Stock exchange to filter results by, specified by <a href="https://en.wikipedia.org/wiki/Market_Identifier_Code">Market Identifier Code</a>, e.g. <code>XNAS</code>',
			},
			{
				displayName: 'Latest',
				name: 'latest',
				type: 'boolean',
				default: false,
				description: 'Whether to fetch the most recent stock market data',
			},
			{
				displayName: 'Sort Order',
				name: 'sort',
				description: 'Order to sort results in',
				type: 'options',
				options: [
					{
						name: 'Ascending',
						value: 'ASC',
					},
					{
						name: 'Descending',
						value: 'DESC',
					},
				],
				default: 'DESC',
			},
			{
				displayName: 'Specific Date',
				name: 'specificDate',
				type: 'dateTime',
				default: '',
				description:
					'Date in YYYY-MM-DD format, e.g. <code>2020-01-01</code>, or in ISO-8601 date format, e.g. <code>2020-05-21T00:00:00+0000</code>',
			},
			{
				displayName: 'Timeframe Start Date',
				name: 'dateFrom',
				type: 'dateTime',
				default: '',
				description:
					'Timeframe start date in YYYY-MM-DD format, e.g. <code>2020-01-01</code>, or in ISO-8601 date format, e.g. <code>2020-05-21T00:00:00+0000</code>',
			},
			{
				displayName: 'Timeframe End Date',
				name: 'dateTo',
				type: 'dateTime',
				default: '',
				description:
					'Timeframe end date in YYYY-MM-DD format, e.g. <code>2020-01-01</code>, or in ISO-8601 date format, e.g. <code>2020-05-21T00:00:00+0000</code>',
			},
		],
	},
];
