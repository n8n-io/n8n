import { INodeProperties } from 'n8n-workflow';
import {TLP} from '../interfaces/AlertInterface';

export const observableOperations = [
    {
        displayName:'Operation',
        name:'operation',
        type:'options',
        required:true,
        default:'getAll',
        displayOptions:{
            show:{
                resource:['observable']
            }
        },
        typeOptions:{
            loadOptionsDependsOn:['resource'],
            loadOptionsMethod:'loadObservableOptions'
        },
        
    },
] as INodeProperties[];

export const observableFields = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll', 'search'],
				resource: ['observable'],
			},
		},
		default: false,
		description:
			'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: ['getAll', 'search'],
				resource: ['observable'],
				returnAll: [false],
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
		name: 'id',
		displayName: 'Observable Id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['observable'],
				operation: ['update', 'executeResponder', 'executeAnalyzer', 'get'],
			},
		},
	},
	{
		name: 'caseId',
		displayName: 'Case Id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['observable'],
				operation: ['create', 'getAll'],
			},
		},
	},
	{
		name: 'dataType',
		displayName: 'Data Type',
		type: 'options',
		required: true,
		default: '',
		options: [
			{ name: 'domain', value: 'domain' },
			{ name: 'file', value: 'file' },
			{ name: 'filename', value: 'filename' },
			{ name: 'fqdn', value: 'fqdn' },
			{ name: 'hash', value: 'hash' },
			{ name: 'ip', value: 'ip' },
			{ name: 'mail', value: 'mail' },
			{ name: 'mail_subject', value: 'mail_subject' },
			{ name: 'other', value: 'other' },
			{ name: 'regexp', value: 'regexp' },
			{ name: 'registry', value: 'registry' },
			{ name: 'uri_path', value: 'uri_path' },
			{ name: 'url', value: 'url' },
			{ name: 'user-agent', value: 'user-agent' },
		],
		displayOptions: {
			show: {
				resource: ['observable'],
				operation: ['create', 'executeAnalyzer'],
			},
		},
	},
	{
		name: 'data',
		displayName: 'Data',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['observable'],
				operation: ['create'],
			},
			hide: { dataType: ['file'] },
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
				resource: ['observable'],
				operation: ['create'],
				dataType: ['file'],
			},
		},
	},
	{
		name: 'message',
		displayName: 'Message',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['observable'],
				operation: ['create'],
			},
		},
	},
	{
		name: 'startDate',
		displayName: 'Start Date',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['observable'],
				operation: ['create'],
			},
		},
	},
	{
		name: 'tlp',
		displayName: 'TLP',
		type: 'options',
		required: true,
		default: 2,
		displayOptions: {
			show: {
				resource: ['observable'],
				operation: ['create'],
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
		name: 'ioc',
		displayName: 'IOC',
		description: 'Indicator of compromise',
		type: 'boolean',
		required: true,
		default: false,
		displayOptions: {
			show: {
				resource: ['observable'],
				operation: ['create'],
			},
		},
	},
	{
		name: 'sighted',
		displayName: 'Sighted',
		description: 'sighted previously',
		type: 'boolean',
		required: true,
		default: false,
		displayOptions: {
			show: {
				resource: ['observable'],
				operation: ['create'],
			},
		},
	},
	{
		name: 'status',
		displayName: 'Status',
		type: 'options',
		required: true,
		default: '',
		options: [
			{ name: 'Ok', value: 'Ok' },
			{ name: 'Deleted', value: 'Deleted' },
		],
		displayOptions: {
			show: {
				resource: ['observable'],
				operation: ['create'],
			},
		},
	},
	// required for analyzer execution
	{
		name: 'analyzers',
		displayName: 'Analyzer',
		type: 'multiOptions',
		required: true,
        default: [],
		typeOptions: {
			loadOptionsDependsOn: ['id', 'dataType'],
			loadOptionsMethod: 'loadAnalyzers',
		},
		displayOptions: {
			show: { resource: ['observable'], operation: ['executeAnalyzer'] },
			hide: { id: [''] },
		},
	},

	// required for responder execution
	{
		name: 'responders',
		displayName: 'Responders',
		type: 'multiOptions',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsDependsOn: ['id'],
			loadOptionsMethod: 'loadResponders',
		},
		displayOptions: {
			show: { resource: ['observable'], operation: ['executeResponder'] },
			hide: { id: [''] },
		},
	},
	// Optional attributes (Create operation)
	{
		displayName: 'Optional attribute',
		name: 'optionals',
		type: 'collection',
		required: false,
		default: '',
		displayOptions: {
			show: {
				resource: ['observable'],
				operation: ['create'],
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
		displayName: 'Optional attribute',
		name: 'optionals',
		type: 'collection',
		required: false,
		default: '',
		displayOptions: {
			show: {
				resource: ['observable'],
				operation: ['update'],
			},
		},
		options: [
			{
				name: 'message',
				displayName: 'Message',
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
				name: 'tlp',
				displayName: 'TLP',
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
				name: 'ioc',
				displayName: 'IOC',
				description: 'Indicator of compromise',
				type: 'boolean',
				required: false,
				default: false,
			},
			{
				name: 'sighted',
				displayName: 'Sighted',
				description: 'sighted previously',
				type: 'boolean',
				required: false,
				default: false,
			},
			{
				name: 'status',
				displayName: 'Status',
				type: 'options',
				required: false,
				default: '',
				options: [
					{ name: 'Ok', value: 'Ok' },
					{ name: 'Deleted', value: 'Deleted' },
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
				operation: ['getAll', 'search'],
				resource: ['observable'],
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
			show: { resource: ['observable'], operation: ['search', 'count'] },
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
					{ name: 'Ok', value: 'Ok' },
					{ name: 'Deleted', value: 'Deleted' },
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
				name: 'tlp',
				displayName: 'TLP',
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
				name: 'ioc',
				displayName: 'IOC',
				description: 'Indicator of compromise',
				type: 'boolean',
				required: false,
				default: false,
			},
			{
				name: 'sighted',
				displayName: 'Sighted',
				type: 'boolean',
				required: false,
				default: false,
			},
			{
				name: 'data',
				displayName: 'Value',
				type: 'string',
				required: false,
				default: '',
				placeholder: 'example.com; 8.8.8.8',
			},
			{
				name: 'dataType',
				displayName: 'Data Type',
				type: 'multiOptions',
				required: false,
				default: '',
				options: [
					{ name: 'domain', value: 'domain' },
					{ name: 'file', value: 'file' },
					{ name: 'filename', value: 'filename' },
					{ name: 'fqdn', value: 'fqdn' },
					{ name: 'hash', value: 'hash' },
					{ name: 'ip', value: 'ip' },
					{ name: 'mail', value: 'mail' },
					{ name: 'mail_subject', value: 'mail_subject' },
					{ name: 'other', value: 'other' },
					{ name: 'regexp', value: 'regexp' },
					{ name: 'registry', value: 'registry' },
					{ name: 'uri_path', value: 'uri_path' },
					{ name: 'url', value: 'url' },
					{ name: 'user-agent', value: 'user-agent' },
				],
			},
			{
				name: 'message',
				displayName: 'Message',
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