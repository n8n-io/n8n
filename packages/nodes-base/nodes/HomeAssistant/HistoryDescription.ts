import type { INodeProperties } from 'n8n-workflow';

export const historyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['history'],
			},
		},
		options: [
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Get many state changes',
				action: 'Get many state changes',
			},
		],
		default: 'getAll',
	},
];

export const historyFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                history:getLogbookEntries                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['history'],
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
				resource: ['history'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['history'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'End time',
				name: 'endTime',
				type: 'dateTime',
				default: '',
				description: 'The end of the period',
			},
			{
				displayName: 'Entity IDs',
				name: 'entityIds',
				type: 'string',
				default: '',
				description: 'The entities IDs separated by comma',
			},
			{
				displayName: 'Minimal response',
				name: 'minimalResponse',
				type: 'boolean',
				default: false,
				description: 'Whether to only return <code>last_changed</code> and state for states',
			},
			{
				displayName: 'Significant changes only',
				name: 'significantChangesOnly',
				type: 'boolean',
				default: false,
				description: 'Whether to only return significant state changes',
			},
			{
				displayName: 'Start time',
				name: 'startTime',
				type: 'dateTime',
				default: '',
				description: 'The beginning of the period',
			},
		],
	},
];
