import type { INodeProperties } from 'n8n-workflow';

export const companyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: {
			show: {
				resource: ['company'],
			},
		},
		options: [
			{
				name: 'Get factor scores',
				value: 'getFactor',
				description: 'Get company factor scores and issue counts',
				action: 'Get a company factor scores and issue counts',
			},
			{
				name: 'Get historical factor scores',
				value: 'getFactorHistorical',
				description: "Get company's historical factor scores",
				action: "Get a company's historical factor scores",
			},
			{
				name: 'Get historical scores',
				value: 'getHistoricalScore',
				description: "Get company's historical scores",
				action: "Get a company's historical scores",
			},
			{
				name: 'Get information and scorecard',
				value: 'getScorecard',
				description: 'Get company information and summary of their scorecard',
				action: 'Get company information and a summary of their scorecard',
			},
			{
				name: 'Get score plan',
				value: 'getScorePlan',
				description: "Get company's score improvement plan",
				action: "Get a company's score improvement plan",
			},
		],
		default: 'getFactor',
	},
];

export const companyFields: INodeProperties[] = [
	{
		displayName: 'Scorecard identifier',
		name: 'scorecardIdentifier',
		description: 'Primary identifier of a company or scorecard, i.e. domain.',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['company'],
				operation: [
					'getScorecard',
					'getFactor',
					'getFactorHistorical',
					'getHistoricalScore',
					'getScorePlan',
				],
			},
		},
	},
	{
		displayName: 'Score',
		name: 'score',
		description: 'Score target',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['getScorePlan'],
			},
		},
		required: true,
		default: 0,
	},
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['getFactor', 'getFactorHistorical', 'getHistoricalScore', 'getScorePlan'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['getFactor', 'getFactorHistorical', 'getHistoricalScore', 'getScorePlan'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['getFactorHistorical', 'getHistoricalScore'],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},

	// company:getFactor
	{
		displayName: 'Filters',
		name: 'filters',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['getFactor'],
			},
		},
		type: 'collection',
		placeholder: 'Add filter',
		default: {},
		options: [
			{
				displayName: 'Severity',
				name: 'severity',
				type: 'string',
				default: '',
				placeholder: '',
			},
			{
				displayName: 'Severity in',
				description: 'Filter issues by comma-separated severity list',
				name: 'severity_in',
				type: 'string',
				default: '',
				placeholder: '',
			},
		],
	},

	// company:getFactorHistorical
	// company:getHistoricalScore
	{
		displayName: 'Options',
		name: 'options',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['getFactorHistorical', 'getHistoricalScore'],
			},
		},
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Date from',
				description: 'History start date',
				name: 'date_from',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Date to',
				description: 'History end date',
				name: 'date_to',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Timing',
				description: 'Date granularity',
				name: 'timing',
				type: 'options',
				options: [
					{
						name: 'Daily',
						value: 'daily',
					},
					{
						name: 'Weekly',
						value: 'weekly',
					},
					{
						name: 'Monthly',
						value: 'monthly',
					},
				],
				default: 'daily',
			},
		],
	},
];
