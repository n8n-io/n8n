import {
	INodeProperties,
} from 'n8n-workflow';

export const exchangeRateOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Get',
				value: 'get',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'exchangeRate',
				],
			},
		},
	},
];

export const exchangeRateFields: INodeProperties[] = [
	// ----------------------------------
	//         exchangeRate: get
	// ----------------------------------
	{
		displayName: 'Source Currency',
		name: 'source',
		type: 'string',
		default: '',
		description: 'Code of the source currency to retrieve the exchange rate for.',
		displayOptions: {
			show: {
				resource: [
					'exchangeRate',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'Target Currency',
		name: 'target',
		type: 'string',
		default: '',
		description: 'Code of the target currency to retrieve the exchange rate for.',
		displayOptions: {
			show: {
				resource: [
					'exchangeRate',
				],
				operation: [
					'get',
				],
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
				resource: [
					'exchangeRate',
				],
				operation: [
					'get',
				],
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
				placeholder: 'Add Range',
				description: 'Range of time to retrieve the exchange rate for.',
				default: {},
				options: [
					{
						displayName: 'Range Properties',
						name: 'rangeProperties',
						values: [
							{
								displayName: 'Range Start',
								name: 'from',
								type: 'dateTime',
								default: '',
							},
							{
								displayName: 'Range End',
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
				description: 'Point in time to retrieve the exchange rate for.',
			},
		],
	},
];
