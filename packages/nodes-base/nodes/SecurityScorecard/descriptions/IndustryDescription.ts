import {
	INodeProperties,
} from 'n8n-workflow';

export const industryOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'industry',
				],
			},
		},
		options: [
			{
				name: 'Get Factor Scores',
				value: 'getFactor',
			},
			{
				name: 'Get Historical Factor Scores',
				value: 'getFactorHistorical',
			},
			{
				name: 'Get Score',
				value: 'getScore',
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
				resource: [
					'industry',
				],
				operation: [
					'getScore',
					'getFactor',
					'getFactorHistorical',
				],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'industry',
				],
				operation: [
					'getFactor',
					'getFactorHistorical',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'industry',
				],
				operation: [
					'getFactor',
					'getFactorHistorical',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 100,
		description: 'Number of results to return.',
	},
	{
		displayName: 'Simplify Response',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'industry',
				],
				operation: [
					'getFactor',
					'getFactorHistorical',
				],
			},
		},
		default: true,
		description: 'Return a simplified version of the response instead of the raw data.',
	},
	{
		displayName: 'Options',
		name: 'options',
		displayOptions: {
			show: {
				resource: [
					'industry',
				],
				operation: [
					'getFactorHistorical',
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
				name: 'from',
				type: 'dateTime',
				default: '',
				required: false,
			},
			{
				displayName: 'Date To',
				description: 'History end date',
				name: 'to',
				type: 'dateTime',
				default: '',
				required: false,
			},
		],
	},
];
