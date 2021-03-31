import {
	INodeProperties,
} from 'n8n-workflow';

export const summaryOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'summary',
				],
			},
		},
		options: [
			{
				name: 'Get Sleep Periods',
				value: 'getSleep',
				description: 'Get the user\'s sleep summary.',
			},
			{
				name: 'Get Activity Summary',
				value: 'getActivity',
				description: 'Get the user\'s activity summary.',
			},
			{
				name: 'Get Readiness Summary',
				value: 'getReadiness',
				description: 'Get the user\'s readiness summary.',
			},
		],
		default: 'getSleep',
		description: 'Operation to perform.',
	},
] as INodeProperties[];

export const summaryFields = [
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
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
				displayName: 'Start Date',
				name: 'start',
				type: 'dateTime',
				default: '',
				description: 'Start date for the summary retrieval. If omitted, it defaults to a week ago.',
			},
			{
				displayName: 'End Date',
				name: 'end',
				type: 'dateTime',
				default: '',
				description: 'End date for the summary retrieval. If omitted, it defaults to the current day.',
			},
		],
	},
] as INodeProperties[];
