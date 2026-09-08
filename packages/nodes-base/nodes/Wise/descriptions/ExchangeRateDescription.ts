import type { INodeProperties } from 'n8n-workflow';

export const exchangeRateOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'get',
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get an exchange rate',
			},
		],
		displayOptions: {
			show: {
				resource: ['exchangeRate'],
			},
		},
	},
];

export const exchangeRateFields: INodeProperties[] = [
	// ----------------------------------
	//         exchangeRate: get
	// ----------------------------------
	{
		displayName: 'Source currency',
		name: 'source',
		type: 'string',
		default: '',
		description: 'Code of the source currency to retrieve the exchange rate for',
		displayOptions: {
			show: {
				resource: ['exchangeRate'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Target currency',
		name: 'target',
		type: 'string',
		default: '',
		description: 'Code of the target currency to retrieve the exchange rate for',
		displayOptions: {
			show: {
				resource: ['exchangeRate'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['exchangeRate'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Interval',
				name: 'interval',
				type: 'options',
				default: 'day',
				options: [
					{
						name: 'Day',
						value: 'day',
					},
					{
						name: 'Hour',
						value: 'hour',
					},
					{
						name: 'Minute',
						value: 'minute',
					},
				],
			},
			{
				displayName: 'Range',
				name: 'range',
				type: 'fixedCollection',
				placeholder: 'Add range',
				description: 'Range of time to retrieve the exchange rate for',
				default: {},
				options: [
					{
						displayName: 'Range properties',
						name: 'rangeProperties',
						values: [
							{
								displayName: 'Range start',
								name: 'from',
								type: 'dateTime',
								default: '',
							},
							{
								displayName: 'Range end',
								name: 'to',
								type: 'dateTime',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Time',
				name: 'time',
				type: 'dateTime',
				default: '',
				description: 'Point in time to retrieve the exchange rate for',
			},
		],
	},
];
