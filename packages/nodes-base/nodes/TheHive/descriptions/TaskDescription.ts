import {
	INodeProperties,
} from 'n8n-workflow';

export const taskOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		default: 'getAll',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'task',
				],
			},
		},
		typeOptions: {
			loadOptionsDependsOn: [
				'operation',
			],
			loadOptionsMethod: 'loadTaskOptions',
		},
	},
] as INodeProperties[];

export const taskFields = [
	{
		displayName: 'Task ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'update',
					'executeResponder',
					'get',
				],
			},
		},
	},
	{
		displayName: 'Case ID',
		name: 'caseId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'create',
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'search',
					'getAll',
				],
				resource: [
					'task',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'search',
					'getAll',
				],
				resource: [
					'task',
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
		description: 'How many results to return.',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		default: 'Waiting',
		options: [
			{
				name: 'Waiting',
				value: 'Waiting',
			},
			{
				name: 'InProgress',
				value: 'InProgress',
			},
			{
				name: 'Completed',
				value: 'Completed',
			},
			{
				name: 'Cancel',
				value: 'Cancel',
			},
		],
		required: true,
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Flag',
		name: 'flag',
		type: 'boolean',
		required: true,
		default: false,
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'create',
				],
			},
		},
	},
	// required for responder execution
	{
		displayName: 'Responder ID',
		name: 'responder',
		type: 'options',
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
					'task',
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
	// optional attributes (Create operations)
	{
		displayName: 'Options',
		type: 'collection',
		name: 'options',
		placeholder: 'Add Option',
		required: false,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Owner',
				name: 'owner',
				type: 'string',
				required: false,
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				required: false,
				default: '',
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				required: false,
				default: '',
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'dateTime',
				required: false,
				default: '',
			},
		],
	},
	// optional attributes (Update operation)

	{
		displayName: 'Update Fields',
		type: 'collection',
		name: 'updateFields',
		placeholder: 'Add Field',
		default: '',
		required: false,
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Owner',
				name: 'owner',
				type: 'string',
				required: false,
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				required: false,
				default: '',
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				required: false,
				default: '',
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'dateTime',
				required: false,
				default: '',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				required: false,
				default: '',
			},
			{
				displayName: 'status',
				name: 'status',
				type: 'options',
				default: 'Waiting',
				options: [
					{
						name: 'Waiting',
						value: 'Waiting',
					},
					{
						name: 'In Progress',
						value: 'InProgress',
					},
					{
						name: 'Completed',
						value: 'Completed',
					},
					{
						name: 'Cancel',
						value: 'Cancel',
					},
				],
				required: false,
			},
			{
				displayName: 'Flag',
				name: 'flag',
				type: 'boolean',
				required: false,
				default: false,
			},
		],
	},

	// query options
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'getAll',
					'search',
				],
				resource: [
					'task',
				],
			},
		},
		options: [
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'string',
				placeholder: '±Attribut, exp +status',
				description: 'Specify the sorting attribut, + for asc, - for desc',
				default: '',
			},
		],
	},
	// query attributes
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		required: false,
		default: {},
		placeholder: 'Add Filter',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'search',
					'count',
				],
			},
		},
		options: [
			{
				displayName: 'Owner',
				name: 'owner',
				type: 'string',
				required: false,
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				required: false,
				default: '',
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				required: false,
				default: '',
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'dateTime',
				required: false,
				default: '',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				required: false,
				default: '',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				required: false,
				default: 'Waiting',
				options: [
					{
						name: 'Waiting',
						value: 'Waiting',
					},
					{
						name: 'In Progress',
						value: 'InProgress'
					},
					{
						name: 'Completed',
						value: 'Completed'
					},
					{
						name: 'Cancel',
						value: 'Cancel'
					},
				],
			},
			{
				displayName: 'Flag',
				name: 'flag',
				type: 'boolean',
				required: false,
				default: false,
			},
		],
	},
] as INodeProperties[];
