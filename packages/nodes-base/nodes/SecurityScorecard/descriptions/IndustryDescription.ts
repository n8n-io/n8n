import {
	INodeProperties,
} from 'n8n-workflow';

export const industryOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'industries',
				],
			},
		},
		options: [
			{ name: 'Get Factor Scores', value: 'getFactor' },
			{ name: 'Get Historical Factor Scores', value: 'getFactorHistorical' },
			{ name: 'Get Score', value: 'getScore' },
		],
		default: 'getFactor',
	},
] as INodeProperties[];

export const industryFields = [
	{
		displayName: 'Industry',
		name: 'industry',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['industries'],
				operation: ['getScore', 'getFactor', 'getFactorHistorical'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		displayOptions: {
			show: {
				resource: [
					'industries',
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
] as INodeProperties[];
