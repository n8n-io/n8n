import {
	INodeProperties,
} from 'n8n-workflow';

export const milestoneOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'milestone',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get milestone start date',
			},
			{
				name: 'Set',
				value: 'set',
				description: 'Set milestone start date',
			},
		],
		default: 'get',
		description: 'The operation to perform',
		noDataExpression: true,
	},
];

export const milestoneFields: INodeProperties[] = [
	{
		displayName: 'Milestone Number',
		name: 'milestoneNumber',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'milestone',
				],
			},
		},
		required: true,
	},

	{
		displayName: 'Start Date',
		name: 'startDate',
		type: 'dateTime',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'milestone',
				],
				operation: [
					'set',
				],
			},
		},
		required: true,
		description: 'Milestone start date',
	},
];
