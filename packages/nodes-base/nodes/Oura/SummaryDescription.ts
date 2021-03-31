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
				description: 'Get personal information',
			},
			{
				name: 'Get Activity Summaries',
				value: 'getActivity',
				description: 'Get personal information',
			},
			{
				name: 'Get Readiness Summaries',
				value: 'getReadiness',
				description: 'Get personal information',
			},
		],
		default: 'getSleep',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const summaryFields = [

	/* -------------------------------------------------------------------------- */
	/*                                summary                                     */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Start Date',
		name: 'start',
		type: 'dateTime',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'summary',
				],
			},
		},
	},
	{
		displayName: 'End Date',
		name: 'end',
		type: 'dateTime',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'summary',
				],
			},
		},
	},
] as INodeProperties[];
