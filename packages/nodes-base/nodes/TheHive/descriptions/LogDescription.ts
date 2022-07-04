import {
	INodeProperties,
} from 'n8n-workflow';

export const logOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		default: 'getAll',
		displayOptions: {
			show: {
				resource: [
					'log',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create task log',
				action: 'Create a log',
			},
			{
				name: 'Execute Responder',
				value: 'executeResponder',
				description: 'Execute a responder on a selected log',
				action: 'Execute a responder',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all task logs',
				action: 'Get all logs',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a single log',
				action: 'Get a log',
			},
		],
	},
];

export const logFields: INodeProperties[] = [
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'log',
				],
				operation: [
					'create',
					'getAll',
				],
			},
		},
		description: 'ID of the task',
	},
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
					'log',
				],
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
				operation: [
					'getAll',
				],
				resource: [
					'log',
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
		description: 'Max number of results to return',
	},
	// required attributs
	{
		displayName: 'Log ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'log',
				],
				operation: [
					'executeResponder',
					'get',
				],
			},
		},
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'log',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Content of the Log',
	},
	{
		displayName: 'Start Date',
		name: 'startDate',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'log',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Date of the log submission default=now',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		options: [
			{
				name: 'Ok',
				value: 'Ok',
			},
			{
				name: 'Deleted',
				value: 'Deleted',
			},
		],
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'log',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Status of the log (Ok or Deleted) default=Ok',
	},
	// required for responder execution
	{
		displayName: 'Responder Name or ID',
		name: 'responder',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsDependsOn: [
				'id',
			],
			loadOptionsMethod: 'loadResponders',
		},
		displayOptions: {
			show: {
				resource: [
					'log',
				],
				operation: [
					'executeResponder',
				],
			},
			hide: {
				id: [
					'',
				],
			},
		},
	},
	// Optional attributs
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'log',
				],
				operation: [
					'create',
				],
			},
		},
		placeholder: 'Add Option',
		options: [
			{
				displayName: 'Attachment',
				name: 'attachmentValues',
				placeholder: 'Add Attachment',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				default: {},
				options: [
					{
						displayName: 'Attachment',
						name: 'attachmentValues',
						values: [
							{
								displayName: 'Binary Property',
								name: 'binaryProperty',
								type: 'string',
								default: 'data',
								description: 'Object property name which holds binary data',
							},
						],
					},
				],
				description: 'File attached to the log',
			},
		],
	},
];
