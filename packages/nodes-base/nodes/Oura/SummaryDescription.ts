import {
	INodeProperties,
} from 'n8n-workflow';

export const summaryOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'summary',
				],
			},
		},
		options: [
			{
				name: 'Get Activity Summary',
				value: 'getActivity',
				description: 'Get the user\'s activity summary',
				action: 'Get activity summary',
			},
			{
				name: 'Get Readiness Summary',
				value: 'getReadiness',
				description: 'Get the user\'s readiness summary',
				action: 'Get readiness summary',
			},
			{
				name: 'Get Sleep Periods',
				value: 'getSleep',
				description: 'Get the user\'s sleep summary',
				action: 'Get sleep summary',
			},
		],
		default: 'getSleep',
	},
];

export const summaryFields: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'summary',
				],
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
				resource: [
					'summary',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 10,
		},
		default: 5,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		displayOptions: {
			show: {
				resource: [
					'summary',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'End Date',
				name: 'end',
				type: 'dateTime',
				default: '',
				description: 'End date for the summary retrieval. If omitted, it defaults to the current day.',
			},
			{
				displayName: 'Start Date',
				name: 'start',
				type: 'dateTime',
				default: '',
				description: 'Start date for the summary retrieval. If omitted, it defaults to a week ago.',
			},
		],
	},
];
