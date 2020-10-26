import {
	INodeProperties,
} from 'n8n-workflow';

import {
	TLP,
} from '../interfaces/AlertInterface';

export const observableOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
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
] as INodeProperties[];

export const observableFields = [
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
		description: 'If all results should be returned or only up to a given limit.',
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
		description: 'How many results to return.',
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
	},
	{
		displayName: 'Data Type',
		name: 'dataType',
		type: 'options',
		required: true,
		default: '',
		options: [
			{
				name: 'domain',
				value: 'domain',
			},
			{
				name: 'file',
				value: 'file'
			},
			{
				name: 'filename',
				value: 'filename'
			},
			{
				name: 'fqdn',
				value: 'fqdn'
			},
			{
				name: 'hash',
				value: 'hash'
			},
			{
				name: 'ip',
				value: 'ip'
			},
			{
				name: 'mail',
				value: 'mail'
			},
			{
				name: 'mail_subject',
				value: 'mail_subject'
			},
			{
				name: 'other',
				value: 'other'
			},
			{
				name: 'regexp',
				value: 'regexp'
			},
			{
				name: 'registry',
				value: 'registry'
			},
			{
				name: 'uri_path',
				value: 'uri_path'
			},
			{
				name: 'url',
				value: 'url'
			},
			{
				name: 'user-agent',
				value: 'user-agent'
			},
		],
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
					'observable'
				],
				operation: [
					'create',
				],
			},
		},
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
	},
	{
		displayName: 'IOC',
		name: 'ioc',
		description: 'Indicator of compromise',
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
		description: 'Sighted previously',
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
	},
	// required for analyzer execution
	{
		displayName: 'Analyzer',
		name: 'analyzers',
		type: 'multiOptions',
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
		required: false,
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
		options: [
			{
				displayName: 'Observable Tags',
				name: 'tags',
				type: 'string',
				required: false,
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
		required: false,
		default: '',
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
				required: false,
				type: 'string',
				default: '',
			},
			{
				displayName: 'Observable Tags',
				name: 'tags',
				type: 'string',
				required: false,
				default: '',
				placeholder: 'tag1,tag2',
			},
			{
				displayName: 'TLP',
				name: 'tlp',
				type: 'options',
				required: false,
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
			},
			{
				displayName: 'IOC',
				name: 'ioc',
				description: 'Indicator of compromise',
				type: 'boolean',
				required: false,
				default: false,
			},
			{
				displayName: 'Sighted',
				name: 'sighted',
				description: 'sighted previously',
				type: 'boolean',
				required: false,
				default: false,
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				required: false,
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
		required: false,
		default: '',
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
				displayName: 'Keyword',
				name: 'keyword',
				type: 'string',
				required: false,
				default: '',
				placeholder: 'exp,freetext',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				required: false,
				default: '',
				placeholder: 'exp,freetext',
			},
			{
				name: 'status',
				displayName: 'Status',
				type: 'options',
				required: false,
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
			},
			{
				displayName: 'Observable Tags',
				name: 'tags',
				type: 'string',
				required: false,
				default: '',
				placeholder: 'tag1,tag2',
			},
			{
				displayName: 'TLP',
				name: 'tlp',
				type: 'options',
				required: false,
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
			},
			{
				displayName: 'IOC',
				name: 'ioc',
				description: 'Indicator of compromise',
				type: 'boolean',
				required: false,
				default: false,
			},
			{
				displayName: 'Sighted',
				name: 'sighted',
				type: 'boolean',
				required: false,
				default: false,
			},
			{
				displayName: 'Value',
				name: 'data',
				type: 'string',
				required: false,
				default: '',
				placeholder: 'example.com; 8.8.8.8',
			},
			{
				displayName: 'Data Type',
				name: 'dataType',
				type: 'multiOptions',
				required: false,
				default: [],
				options: [
					{
						name: 'domain',
						value: 'domain'
					},
					{
						name: 'file',
						value: 'file'
					},
					{
						name: 'filename',
						value: 'filename'
					},
					{
						name: 'fqdn',
						value: 'fqdn'
					},
					{
						name: 'hash',
						value: 'hash'
					},
					{
						name: 'ip',
						value: 'ip'
					},
					{
						name: 'mail',
						value: 'mail'
					},
					{
						name: 'mail_subject',
						value: 'mail_subject'
					},
					{
						name: 'other',
						value: 'other'
					},
					{
						name: 'regexp',
						value: 'regexp'
					},
					{
						name: 'registry',
						value: 'registry'
					},
					{
						name: 'uri_path',
						value: 'uri_path'
					},
					{
						name: 'url',
						value: 'url'
					},
					{
						name: 'user-agent',
						value: 'user-agent'
					},
				],
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				required: false,
				default: '',
			},
			{
				displayName: 'Date range',
				type: 'fixedCollection',
				name: 'range',
				default: {},
				options: [
					{
						displayName: 'Add date range inputs',
						name: 'dateRange',
						values: [
							{
								displayName: 'From date',
								name: 'fromDate',
								type: 'dateTime',
								required: false,
								default: '',
							},
							{
								displayName: 'To date',
								name: 'toDate',
								type: 'dateTime',
								required: false,
								default: '',
							},
						],
					},
				],
			},
		],
	},
] as INodeProperties[];
