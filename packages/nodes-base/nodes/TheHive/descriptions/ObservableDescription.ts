import {
	INodeProperties,
} from 'n8n-workflow';

import {
	TLP,
} from '../interfaces/AlertInterface';

export const observableOperations: INodeProperties[] = [
	{
		displayName: 'Operation Name or ID',
		name: 'operation',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		noDataExpression: true,
		required: true,
		default: 'getAll',
		displayOptions: {
			show: {
				resource: [
					'observable',
				],
			},
		},
		typeOptions: {
			loadOptionsDependsOn: [
				'resource',
			],
			loadOptionsMethod: 'loadObservableOptions',
		},
	},
];

export const observableFields: INodeProperties[] = [
	{
		displayName: 'Case ID',
		name: 'caseId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'observable',
				],
				operation: [
					'create',
					'getAll',
				],
			},
		},
		description: 'ID of the case',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
					'search',
				],
				resource: [
					'observable',
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
					'search',
				],
				resource: [
					'observable',
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
		displayName: 'Observable ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'observable',
				],
				operation: [
					'update',
					'executeResponder',
					'executeAnalyzer',
					'get',
				],
			},
		},
		description: 'ID of the observable',
	},
	{
		displayName: 'Data Type Name or ID',
		name: 'dataType',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'loadObservableTypes',
		},
		displayOptions: {
			show: {
				resource: [
					'observable',
				],
				operation: [
					'create',
					'executeAnalyzer',
				],
			},
		},
		description: 'Type of the observable. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Data',
		name: 'data',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'observable',
				],
				operation: [
					'create',
				],
			},
			hide: {
				dataType: [
					'file',
				],
			},
		},
	},
	{
		displayName: 'Binary Property',
		name: 'binaryProperty',
		type: 'string',
		required: true,
		default: 'data',
		description: 'Binary Property that represent the attachment file',
		displayOptions: {
			show: {
				resource: [
					'observable',
				],
				operation: [
					'create',
				],
				dataType: [
					'file',
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
					'observable',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Description of the observable in the context of the case',
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
					'observable',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Date and time of the begin of the case default=now',
	},
	{
		displayName: 'TLP',
		name: 'tlp',
		type: 'options',
		required: true,
		default: 2,
		displayOptions: {
			show: {
				resource: [
					'observable',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				name: 'White',
				value: TLP.white,
			},
			{
				name: 'Green',
				value: TLP.green,
			},
			{
				name: 'Amber',
				value: TLP.amber,
			},
			{
				name: 'Red',
				value: TLP.red,
			},
		],
		description: 'Traffict Light Protocol (TLP). Default=Amber.',
	},
	{
		displayName: 'IOC',
		name: 'ioc',
		type: 'boolean',
		required: true,
		default: false,
		displayOptions: {
			show: {
				resource: [
					'observable',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Whether the observable is an IOC (Indicator of compromise)',
	},
	{
		displayName: 'Sighted',
		name: 'sighted',
		type: 'boolean',
		required: true,
		default: false,
		displayOptions: {
			show: {
				resource: [
					'observable',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Whether sighted previously',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		required: true,
		default: '',
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
		displayOptions: {
			show: {
				resource: [
					'observable',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Status of the observable. Default=Ok.',
	},
	// required for analyzer execution
	{
		displayName: 'Analyzer Names or IDs',
		name: 'analyzers',
		type: 'multiOptions',
		description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsDependsOn: [
				'id',
				'dataType',
			],
			loadOptionsMethod: 'loadAnalyzers',
		},
		displayOptions: {
			show: {
				resource: [
					'observable',
				],
				operation: [
					'executeAnalyzer',
				],
			},
			hide: {
				id: [
					'',
				],
			},
		},
	},

	// required for responder execution
	{
		displayName: 'Responder Name or ID',
		name: 'responder',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
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
					'observable',
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
	// Optional attributes (Create operation)
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'observable',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Observable Tags',
				name: 'tags',
				type: 'string',
				default: '',
				placeholder: 'tag1,tag2',
			},
		],
	},
	// Optional attributes (Update operation)
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'observable',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				description: 'Description of the observable in the context of the case',

			},
			{
				displayName: 'Observable Tags',
				name: 'tags',
				type: 'string',
				default: '',
				placeholder: 'tag1,tag2',
			},
			{
				displayName: 'TLP',
				name: 'tlp',
				type: 'options',
				default: 2,
				options: [
					{
						name: 'White',
						value: TLP.white,
					},
					{
						name: 'Green',
						value: TLP.green,
					},
					{
						name: 'Amber',
						value: TLP.amber,
					},
					{
						name: 'Red',
						value: TLP.red,
					},
				],
				description: 'Traffict Light Protocol (TLP). Default=Amber.',
			},
			{
				displayName: 'IOC',
				name: 'ioc',
				type: 'boolean',
				default: false,
				description: 'Whether the observable is an IOC (Indicator of compromise)',
			},
			{
				displayName: 'Sighted',
				name: 'sighted',
				description: 'Whether sighted previously',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: '',
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
				description: 'Status of the observable. Default=Ok.',
			},
		],
	},
	// query options
	{
		displayName: 'Options',
		name: 'options',
		displayOptions: {
			show: {
				operation: [
					'getAll',
					'search',
				],
				resource: [
					'observable',
				],
			},
		},
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
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
		default: {},
		placeholder: 'Add Filter',
		displayOptions: {
			show: {
				resource: [
					'observable',
				],
				operation: [
					'search',
					'count',
				],
			},
		},
		options: [
			{
				displayName: 'Data Type Names or IDs',
				name: 'dataType',
				type: 'multiOptions',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'loadObservableTypes',
				},
				description: 'Type of the observable. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Date Range',
				type: 'fixedCollection',
				name: 'range',
				default: {},
				options: [
					{
						displayName: 'Add Date Range Inputs',
						name: 'dateRange',
						values: [
							{
								displayName: 'From Date',
								name: 'fromDate',
								type: 'dateTime',
								default: '',
							},
							{
								displayName: 'To Date',
								name: 'toDate',
								type: 'dateTime',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				placeholder: 'exp,freetext',
			},
			{
				displayName: 'IOC',
				name: 'ioc',
				type: 'boolean',
				default: false,
				description: 'Whether the observable is an IOC (Indicator of compromise)',
			},
			{
				displayName: 'Keyword',
				name: 'keyword',
				type: 'string',
				default: '',
				placeholder: 'exp,freetext',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				description: 'Description of the observable in the context of the case',
			},
			{
				displayName: 'Observable Tags',
				name: 'tags',
				type: 'string',
				default: '',
				placeholder: 'tag1,tag2',
			},
			{
				displayName: 'Sighted',
				name: 'sighted',
				type: 'boolean',
				default: false,
			},
			{
				name: 'Status',
				displayName: 'Status',
				type: 'options',
				default: '',
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
				description: 'Status of the observable. Default=Ok.',
			},
			{
				displayName: 'TLP',
				name: 'tlp',
				type: 'options',
				default: 2,
				options: [
					{
						name: 'White',
						value: TLP.white,
					},
					{
						name: 'Green',
						value: TLP.green,
					},
					{
						name: 'Amber',
						value: TLP.amber,
					},
					{
						name: 'Red',
						value: TLP.red,
					},
				],
				description: 'Traffict Light Protocol (TLP). Default=Amber.',
			},
			{
				displayName: 'Value',
				name: 'data',
				type: 'string',
				default: '',
				placeholder: 'example.com; 8.8.8.8',
			},
		],
	},
];
