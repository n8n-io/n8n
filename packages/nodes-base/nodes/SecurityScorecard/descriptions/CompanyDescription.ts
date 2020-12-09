import {
	INodeProperties,
} from 'n8n-workflow';

export const companyOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'companies',
				],
			},
		},
		options: [
			{ name: 'Get factor scores', value: 'getFactor', description: 'Gets company factor scores and issue counts' },
			{ name: 'Get historical factor scores', value: 'getFactorHistorical', description: 'Gets company\'s historical factor scores' },
			{ name: 'Get historical scores', value: 'getHistoricalScore', description: 'Gets company\'s historical scores' },
			{ name: 'Get information and scorecard', value: 'getScorecard', description: 'Gets company information and summary of their scorecard' },
			{ name: 'Get score plan', value: 'getScorePlan', description: 'Gets company\'s score improvement plan' },
		],
		default: 'getFactor',
	},
] as INodeProperties[];

export const companyFields = [
	{
		displayName: 'Scorecard Identifier',
		name: 'scorecardIdentifier',
		description: 'Primary identifier of a company or scorecard, i.e. domain',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['companies'],
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
	// companies:getFactor
	{
		displayName: 'Filters',
		name: 'filters',
		displayOptions: {
			show: {
				resource: [
					'companies',
				],
				operation: [
					'getFactor',
				],
			},
		},
		type: 'collection',
		placeholder: 'Add Filter',
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
				displayName: 'Severity In',
				description: 'Filter issues by comma separated severity list',
				name: 'severity_in',
				type: 'string',
				default: '',
				placeholder: '',
			},
		],
	},
	// companies:getFactorHistorical
	// companies:getHistoricalScore
	{
		displayName: 'Options',
		name: 'options',
		displayOptions: {
			show: {
				resource: [
					'companies',
				],
				operation: [
					'getFactorHistorical',
					'getHistoricalScore',
				],
			},
		},
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Date From',
				description: 'History start date',
				name: 'date_from',
				type: 'dateTime',
				default: '',
				required: false,
				
			},
			{
				displayName: 'Date To',
				description: 'History end date',
				name: 'date_to',
				type: 'dateTime',
				default: '',
				required: false,
			},
			{
				displayName: 'Timing',
				description: 'Date granularity',
				name: 'timing',
				type: 'options',
				options: [
					{ name: 'Daily', value: 'daily' },
					{ name: 'Weekly', value: 'weekly' },
					{ name: 'Monthly', value: 'monthly' },
				],
				default: 'daily',
				required: false,
			},
		],
	},
	{
		displayName: 'Score',
		name: 'score',
		description: 'Score target',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['companies'],
				operation: ['getScorePlan'],
			},
		},
		required: true,
		default: 0,
	},
] as INodeProperties[];
