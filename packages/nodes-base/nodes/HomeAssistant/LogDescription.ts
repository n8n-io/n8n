import {
	INodeProperties
} from 'n8n-workflow';

export const logOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'log',
				],
			},
		},
		options: [
			{
				name: 'Get Error Logs',
				value: 'getErroLogs',
				description: 'Get a log for a specific entity',
			},
			{
				name: 'Get Logbook Entries',
				value: 'getLogbookEntries',
				description: 'Get all logs',
			},
		],
		default: 'getErroLogs',
		description: 'The operation to perform.',
	},
];

export const logFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                log:getLogbookEntries                       */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'log',
				],
				operation: [
					'getLogbookEntries',
				],
			},
		},
		options: [
			{
				displayName: 'End Time',
				name: 'endTime',
				type: 'dateTime',
				default: '',
				description: 'The end of the period.',
			},
			{
				displayName: 'Entity ID',
				name: 'entityId',
				type: 'string',
				default: '',
				description: 'The entity ID.',
			},
			{
				displayName: 'Start Time',
				name: 'startTime',
				type: 'dateTime',
				default: '',
				description: 'The beginning of the period.',
			},
		],
	},
];
