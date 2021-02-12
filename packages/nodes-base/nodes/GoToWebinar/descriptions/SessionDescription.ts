import {
	INodeProperties,
} from 'n8n-workflow';

export const sessionOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Get Details',
				value: 'getDetails',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'session',
				],
			},
		},
	},
] as INodeProperties[];

export const sessionFields = [
	// ----------------------------------
	//         session: getAll
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Return all results.',
		displayOptions: {
			show: {
				resource: [
					'session',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 10,
		description: 'The number of results to return.',
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				resource: [
					'session',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'session',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Time Range',
				name: 'times',
				type: 'fixedCollection',
				required: true,
				default: {},
				options: [
					{
						displayName: 'Times Properties',
						name: 'timesProperties',
						values: [
							{
								displayName: 'Start Time',
								name: 'fromTime',
								type: 'dateTime',
								default: '',
							},
							{
								displayName: 'End Time',
								name: 'toTime',
								type: 'dateTime',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Filter By Webinar',
				name: 'filterByWebinar',
				type: 'boolean',
				default: false,
				description: '',
			},
			{
				displayName: 'Webinar Key',
				name: 'webinarKey',
				type: 'string',
				default: '',
				description: '',
			},
		],
	},

	// ----------------------------------
	//      session: shared fields
	// ----------------------------------
	{
		displayName: 'Webinar Key',
		name: 'webinarKey',
		type: 'string',
		required: true,
		default: '',
		description: '',
		displayOptions: {
			show: {
				resource: [
					'session',
				],
				operation: [
					'get',
					'getDetails',
				],
			},
		},
	},
	{
		displayName: 'Session Key',
		name: 'sessionKey',
		type: 'string',
		required: true,
		default: '',
		description: '',
		displayOptions: {
			show: {
				resource: [
					'session',
				],
				operation: [
					'get',
					'getDetails',
				],
			},
		},
	},

	// ----------------------------------
	//        session: getDetails
	// ----------------------------------
	{
		displayName: 'Details',
		name: 'details',
		type: 'options',
		default: 'performance',
		options: [
			{
				name: 'Performance',
				value: 'performance',
			},
			{
				name: 'Polls',
				value: 'polls',
			},
			{
				name: 'Questions',
				value: 'questions',
			},
			{
				name: 'Surveys',
				value: 'surveys',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'session',
				],
				operation: [
					'getDetails',
				],
			},
		},
	},
] as INodeProperties[];
