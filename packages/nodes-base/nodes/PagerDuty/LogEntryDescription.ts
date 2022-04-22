import {
	INodeProperties,
 } from 'n8n-workflow';

export const logEntryOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'logEntry',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a log entry',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all log entries',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
];

export const logEntryFields: INodeProperties[] = [
/* -------------------------------------------------------------------------- */
/*                                 logEntry:get                               */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Log Entry ID',
		name: 'logEntryId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'logEntry',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'Unique identifier for the log entry.',
	},
/* -------------------------------------------------------------------------- */
/*                                 logEntry:getAll                            */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'logEntry',
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
				operation: [
					'getAll',
				],
				resource: [
					'logEntry',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'logEntry',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Include',
				name: 'include',
				type: 'multiOptions',
				options: [
					{
						name: 'Channels',
						value: 'channels',
					},
					{
						name: 'Incidents',
						value: 'incidents',
					},
					{
						name: 'Services',
						value: 'services',
					},
					{
						name: 'Teams',
						value: 'teams',
					},
				],
				default: [],
				description: 'Additional details to include.',
			},
			{
				displayName: 'Is Overview',
				name: 'isOverview',
				type: 'boolean',
				default: false,
				description: 'If true, will return a subset of log entries that show only the most important changes to the incident.',
			},
			{
				displayName: 'Since',
				name: 'since',
				type: 'dateTime',
				default: '',
				description: 'The start of the date range over which you want to search. (the limit on date ranges is 6 months)',
			},
			{
				displayName: 'Timezone',
				name: 'timeZone',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTimezones',
				},
				default: '',
				description: 'Time zone in which dates in the result will be rendered. If not set dates will return UTC',
			},
			{
				displayName: 'Until',
				name: 'until',
				type: 'dateTime',
				default: '',
				description: 'The end of the date range over which you want to search. (the limit on date ranges is 6 months)',
			},
		],
	},
];
