import type { INodeProperties } from 'n8n-workflow';

export const logEntryOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['logEntry'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a log entry',
				action: 'Get a log entry',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many log entries',
				action: 'Get many log entries',
			},
		],
		default: 'get',
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
				resource: ['logEntry'],
				operation: ['get'],
			},
		},
		description: 'Unique identifier for the log entry',
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
				operation: ['getAll'],
				resource: ['logEntry'],
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
				operation: ['getAll'],
				resource: ['logEntry'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['logEntry'],
				operation: ['getAll'],
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
				description: 'Additional details to include',
			},
			{
				displayName: 'Is Overview',
				name: 'isOverview',
				type: 'boolean',
				default: false,
				description:
					'Whether to return a subset of log entries that show only the most important changes to the incident',
			},
			{
				displayName: 'Since',
				name: 'since',
				type: 'dateTime',
				default: '',
				description:
					'The start of the date range over which you want to search. (the limit on date ranges is 6 months).',
			},
			{
				displayName: 'Timezone Name or ID',
				name: 'timeZone',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTimezones',
				},
				default: '',
				description:
					'Time zone in which dates in the result will be rendered. If not set dates will return UTC. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Until',
				name: 'until',
				type: 'dateTime',
				default: '',
				description:
					'The end of the date range over which you want to search. (the limit on date ranges is 6 months).',
			},
		],
	},
];
