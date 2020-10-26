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
				description: 'Returns free/busy information for a set of calendars',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const freeBusyFields = [
	{
		displayName: 'Calendar',
		name: 'calendar',
		type: 'multiOptions',
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
] as INodeProperties[];
