import {
	INodeProperties,
} from 'n8n-workflow';

export const freeBusyOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'freeBusy',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Returns free/busy information for a calendar',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const freeBusyFields = [
	{
		displayName: 'Calendar ID',
		name: 'calendarId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCalendars',
		},
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'freeBusy',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Time Min.',
		name: 'timeMin',
		type: 'dateTime',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'freeBusy',
				],
			},
		},
		default: '',
		description: 'Start of the interval',
	},
	{
		displayName: 'Time Max.',
		name: 'timeMax',
		type: 'dateTime',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'freeBusy',
				],
			},
		},
		default: '',
		description: 'End of the interval',
	},
	{
		displayName: 'Simple',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'freeBusy',
				],
				operation: [
					'get',
				],
			},
		},
		default: true,
		description: 'When set to true a simplify version of the response will be used else the raw data.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'freeBusy',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Timezone',
				name: 'timezone',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTimezones',
				},
				default: '',
				description: 'Time zone used in the response. By default n8n timezone is used.',
			},
		],
	},
] as INodeProperties[];
