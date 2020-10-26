import {
	INodeProperties,
} from 'n8n-workflow';

import {
	TLP,
} from '../interfaces/AlertInterface';

export const caseOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		default: 'getAll',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'case',
				],
			},
		},
		typeOptions: {
			loadOptionsDependsOn: [
				'resource',
			],
			loadOptionsMethod: 'loadCaseOptions',
		},
	},
] as INodeProperties[];

export const caseFields = [
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
					'case',
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
				],
				resource: [
					'case',
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
	// Required fields
	{
		displayName: 'Case ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'case',
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
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'case',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'case',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Severity',
		name: 'severity',
		type: 'options',
		options: [
			{
				name: 'Low',
				value: 1,
			},
			{
				name: 'Medium',
				value: 2,
			},
			{
				name: 'High',
				value: 3,
			},
		],
		required: true,
		default: 2,
		displayOptions: {
			show: {
				resource: [
					'case',
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
					'case',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Owner',
		name: 'owner',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'case',
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
					'case',
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
		displayOptions: {
			show: {
				resource: [
					'case',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Case Tags',
		name: 'tags',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'case',
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
		default: '',
		required: true,
		typeOptions: {
			loadOptionsDependsOn: [
				'id',
			],
			loadOptionsMethod: 'loadResponders',
		},
		displayOptions: {
			show: {
				resource: [
					'case',
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
	// Optional fields (Create operation)
	{
		displayName: 'Options',
		type: 'collection',
		name: 'options',
		placeholder: 'Add options',
		displayOptions: {
			show: {
				resource: [
					'case',
				],
				operation: [
					'create',
				],
			},
		},
		required: false,
		default: '',
		options: [
			{
				displayName: 'Resolution Status',
				name: 'resolutionStatus',
				type: 'options',
				required: false,
				default: '',
				options: [
					{
						value: 'Indeterminate',
						name: 'Indeterminate'
					},
					{
						value: 'FalsePositive',
						name: 'FalsePositive'
					},
					{
						value: 'TruePositive',
						name: 'TruePositive'
					},
					{
						value: 'Other',
						name: 'Other'
					},
					{
						value: 'Duplicated',
						name: 'Duplicated'
					},
				],
			},
			{
				displayName: 'Impact Status',
				name: 'impactStatus',
				type: 'options',
				required: false,
				default: '',
				options: [
					{
						name: 'NoImpact',
						value: 'NoImpact'
					},
					{
						name: 'WithImpact',
						value: 'WithImpact'
					},
					{
						name: 'NotApplicable',
						value: 'NotApplicable'
					},
				],
			},
			{
				displayName: 'Summary',
				name: 'summary',
				required: false,
				type: 'string',
				default: '',
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				required: false,
				default: '',
				type: 'dateTime',
			},
			{
				displayName: 'Metrics',
				name: 'metrics',
				required: false,
				default: '[]',
				type: 'json',
			},
		],
	},
	// Optional fields (Update operations)
	{
		displayName: 'Update Fields',
		type: 'collection',
		name: 'updateFields',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'case',
				],
				operation: [
					'update',
				],
			},
		},
		required: false,
		default: '',
		options: [
			{
				displayName: 'Title',
				name: 'title',
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
				displayName: 'Severity',
				name: 'severity',
				type: 'options',
				options: [
					{
						name: 'Low',
						value: 1
					},
					{
						name: 'Medium',
						value: 2
					},
					{
						name: 'High',
						value: 3
					},
				],
				required: false,
				default: 2,
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Open',
						value: 'Open',
					},
					{
						name: 'Resolved',
						value: 'Resolved',
					},
					{
						name: 'Deleted',
						value: 'Deleted',
					},
			],
				required: false,
				default: 'Open',
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				required: false,
				default: '',
			},
			{
				displayName: 'Owner',
				name: 'owner',
				type: 'string',
				required: false,
				default: '',
			},
			{
				displayName: 'Flag',
				name: 'flag',
				type: 'boolean',
				required: false,
				default: false,
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
				displayName: 'Case Tags',
				name: 'tags',
				type: 'string',
				default: '',
				required: false,
			},
			{
				displayName: 'Resolution Status',
				name: 'resolutionStatus',
				type: 'options',
				required: false,
				default: '',
				options: [
					{
						value: 'Indeterminate',
						name: 'Indeterminate'
					},
					{
						value: 'FalsePositive',
						name: 'FalsePositive'
					},
					{
						value: 'TruePositive',
						name: 'TruePositive'
					},
					{
						value: 'Other',
						name: 'Other'
					},
					{
						value: 'Duplicated',
						name: 'Duplicated'
					},
				],
			},
			{
				displayName: 'Impact Status',
				name: 'impactStatus',
				type: 'options',
				required: false,
				default: '',
				options: [
					{
						name: 'NoImpact',
						value: 'NoImpact'
					},
					{
						name: 'WithImpact',
						value: 'WithImpact'
					},
					{
						name: 'NotApplicable',
						value: 'NotApplicable'
					},
				],
			},
			{
				displayName: 'Summary',
				name: 'summary',
				type: 'string',
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
				displayName: 'Metrics',
				name: 'metrics',
				type: 'json',
				required: false,
				default: '[]',
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
				],
				resource: [
					'case',
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
	// Query filters
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		required: false,
		default: {},
		placeholder: 'Add a Filter',
		displayOptions: {
			show: {
				resource: [
					'case'
				],
				operation: [
					'getAll',
					'count',
				],
			},
		},
		options: [
			{
				displayName: 'Summary',
				name: 'summary',
				type: 'string',
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
				displayName: 'Description',
				name: 'description',
				type: 'string',
				required: false,
				default: '',
			},
			{
				displayName: 'Owner',
				name: 'owner',
				type: 'string',
				required: false,
				default: '',
			},
			{
				displayName: 'Severity',
				name: 'severity',
				type: 'options',
				options: [
					{
						name: 'Low',
						value: 1
					},
					{
						name: 'Medium',
						value: 2
					},
					{
						name: 'High',
						value: 3
					},
				],
				required: false,
				default: 2,
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Open',
						value: 'Open',
					},
					{
						name: 'Resolved',
						value: 'Resolved',
					},
					{
						name: 'Deleted',
						value: 'Deleted',
					},
				],
				required: false,
				default: 'Open',
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
				displayName: 'Flag',
				name: 'flag',
				type: 'boolean',
				required: false,
				default: false,
			},

			{
				displayName: 'Case Tags',
				name: 'tags',
				type: 'string',
				required: false,
				default: '',
			},
			{
				displayName: 'Resolution Status',
				name: 'resolutionStatus',
				type: 'options',
				required: false,
				default: '',
				options: [
					{
						value: 'Indeterminate',
						name: 'Indeterminate',
					},
					{
						value: 'FalsePositive',
						name: 'FalsePositive',
					},
					{
						value: 'TruePositive',
						name: 'TruePositive',
					},
					{
						value: 'Other',
						name: 'Other',
					},
					{
						value: 'Duplicated',
						name: 'Duplicated',
					},
				],
			},
			{
				displayName: 'Impact Status',
				name: 'impactStatus',
				type: 'options',
				required: false,
				default: '',
				options: [
					{
						name: 'NoImpact',
						value: 'NoImpact',
					},
					{
						name: 'WithImpact',
						value: 'WithImpact',
					},
					{
						name: 'NotApplicable',
						value: 'NotApplicable',
					},
				],
			},
		],
	},
] as INodeProperties[];
