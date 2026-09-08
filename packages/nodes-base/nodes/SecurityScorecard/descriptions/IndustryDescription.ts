import type { INodeProperties } from 'n8n-workflow';

export const industryOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: {
			show: {
				resource: ['industry'],
			},
		},
		options: [
			{
				name: 'Get factor scores',
				value: 'getFactor',
				action: 'Get factor scores for an industry',
			},
			{
				name: 'Get historical factor scores',
				value: 'getFactorHistorical',
				action: 'Get historical factor scores for an industry',
			},
			{
				name: 'Get score',
				value: 'getScore',
				action: 'Get the score for an industry',
			},
		],
		default: 'getFactor',
	},
];

export const industryFields: INodeProperties[] = [
	{
		displayName: 'Industry',
		name: 'industry',
		type: 'options',
		default: 'food',
		options: [
			{
				name: 'Food',
				value: 'food',
			},
			{
				name: 'Healthcare',
				value: 'healthcare',
			},
			{
				name: 'Manofacturing',
				value: 'manofacturing',
			},
			{
				name: 'Retail',
				value: 'retail',
			},
			{
				name: 'Technology',
				value: 'technology',
			},
		],
		required: true,
		displayOptions: {
			show: {
				resource: ['industry'],
				operation: ['getScore', 'getFactor', 'getFactorHistorical'],
			},
		},
	},
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['industry'],
				operation: ['getFactor', 'getFactorHistorical'],
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
				resource: ['industry'],
				operation: ['getFactor', 'getFactorHistorical'],
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
				resource: ['industry'],
				operation: ['getFactor', 'getFactorHistorical'],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Options',
		name: 'options',
		displayOptions: {
			show: {
				resource: ['industry'],
				operation: ['getFactorHistorical'],
			},
		},
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Date from',
				description: 'History start date',
				name: 'from',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Date to',
				description: 'History end date',
				name: 'to',
				type: 'dateTime',
				default: '',
			},
		],
	},
];
