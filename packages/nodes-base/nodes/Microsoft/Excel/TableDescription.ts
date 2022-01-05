import { INodeProperties } from 'n8n-workflow';

export const tableOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'table',
				],
			},
		},
		options: [
			{
				name: 'Add Row',
				value: 'addRow',
				description: 'Adds rows to the end of the table',
			},
			{
				name: 'Get Columns',
				value: 'getColumns',
				description: 'Retrieve a list of tablecolumns',
			},
			{
				name: 'Get Rows',
				value: 'getRows',
				description: 'Retrieve a list of tablerows',
			},
			{
				name: 'Lookup',
				value: 'lookup',
				description: 'Looks for a specific column value and then returns the matching row',
			},
		],
		default: 'addRow',
		description: 'The operation to perform.',
	},
];

export const tableFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                                 table:addRow                               */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Workbook',
		name: 'workbook',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWorkbooks',
		},
		displayOptions: {
			show: {
				operation: [
					'addRow',
				],
				resource: [
					'table',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Worksheet',
		name: 'worksheet',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getworksheets',
			loadOptionsDependsOn: [
				'workbook',
			],
		},
		displayOptions: {
			show: {
				operation: [
					'addRow',
				],
				resource: [
					'table',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Table',
		name: 'table',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getTables',
			loadOptionsDependsOn: [
				'worksheet',
			],
		},
		displayOptions: {
			show: {
				operation: [
					'addRow',
				],
				resource: [
					'table',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'addRow',
				],
				resource: [
					'table',
				],
			},
		},
		options: [
			{
				displayName: 'Index',
				name: 'index',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description: `Specifies the relative position of the new row. If not defined, the addition happens at the end. Any rows below the inserted row are shifted downwards. Zero-indexed`,
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 table:getRows                              */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Workbook',
		name: 'workbook',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWorkbooks',
		},
		displayOptions: {
			show: {
				operation: [
					'getRows',
				],
				resource: [
					'table',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Worksheet',
		name: 'worksheet',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getworksheets',
			loadOptionsDependsOn: [
				'workbook',
			],
		},
		displayOptions: {
			show: {
				operation: [
					'getRows',
				],
				resource: [
					'table',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Table',
		name: 'table',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getTables',
			loadOptionsDependsOn: [
				'worksheet',
			],
		},
		displayOptions: {
			show: {
				operation: [
					'getRows',
				],
				resource: [
					'table',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getRows',
				],
				resource: [
					'table',
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
					'getRows',
				],
				resource: [
					'table',
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
		displayName: 'RAW Data',
		name: 'rawData',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getRows',
				],
				resource: [
					'table',
				],
			},
		},
		default: false,
		description: 'If the data should be returned RAW instead of parsed into keys according to their header.',
	},
	{
		displayName: 'Data Property',
		name: 'dataProperty',
		type: 'string',
		default: 'data',
		displayOptions: {
			show: {
				operation: [
					'getRows',
				],
				resource: [
					'table',
				],
				rawData: [
					true,
				],
			},
		},
		description: 'The name of the property into which to write the RAW data.',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'getRows',
				],
				resource: [
					'table',
				],
				rawData: [
					true,
				],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: `Fields the response will containt. Multiple can be added separated by ,.`,
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 table:getColumns                           */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Workbook',
		name: 'workbook',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWorkbooks',
		},
		displayOptions: {
			show: {
				operation: [
					'getColumns',
				],
				resource: [
					'table',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Worksheet',
		name: 'worksheet',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getworksheets',
			loadOptionsDependsOn: [
				'workbook',
			],
		},
		displayOptions: {
			show: {
				operation: [
					'getColumns',
				],
				resource: [
					'table',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Table',
		name: 'table',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getTables',
			loadOptionsDependsOn: [
				'worksheet',
			],
		},
		displayOptions: {
			show: {
				operation: [
					'getColumns',
				],
				resource: [
					'table',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getColumns',
				],
				resource: [
					'table',
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
					'getColumns',
				],
				resource: [
					'table',
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
		displayName: 'RAW Data',
		name: 'rawData',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getColumns',
				],
				resource: [
					'table',
				],
			},
		},
		default: false,
		description: 'If the data should be returned RAW instead of parsed into keys according to their header.',
	},
	{
		displayName: 'Data Property',
		name: 'dataProperty',
		type: 'string',
		default: 'data',
		displayOptions: {
			show: {
				operation: [
					'getColumns',
				],
				resource: [
					'table',
				],
				rawData: [
					true,
				],
			},
		},
		description: 'The name of the property into which to write the RAW data.',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'getColumns',
				],
				resource: [
					'table',
				],
				rawData: [
					true,
				],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: `Fields the response will containt. Multiple can be added separated by ,.`,
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 table:lookup                               */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Workbook',
		name: 'workbook',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getWorkbooks',
		},
		displayOptions: {
			show: {
				operation: [
					'lookup',
				],
				resource: [
					'table',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Worksheet',
		name: 'worksheet',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getworksheets',
			loadOptionsDependsOn: [
				'workbook',
			],
		},
		displayOptions: {
			show: {
				operation: [
					'lookup',
				],
				resource: [
					'table',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Table',
		name: 'table',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getTables',
			loadOptionsDependsOn: [
				'worksheet',
			],
		},
		displayOptions: {
			show: {
				operation: [
					'lookup',
				],
				resource: [
					'table',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Lookup Column',
		name: 'lookupColumn',
		type: 'string',
		default: '',
		placeholder: 'Email',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'table',
				],
				operation: [
					'lookup',
				],
			},
		},
		description: 'The name of the column in which to look for value.',
	},
	{
		displayName: 'Lookup Value',
		name: 'lookupValue',
		type: 'string',
		default: '',
		placeholder: 'frank@example.com',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'table',
				],
				operation: [
					'lookup',
				],
			},
		},
		description: 'The value to look for in column.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'table',
				],
				operation: [
					'lookup',
				],
			},
		},
		options: [
			{
				displayName: 'Return All Matches',
				name: 'returnAllMatches',
				type: 'boolean',
				default: false,
				description: 'By default only the first result gets returned. If options gets set all found matches get returned.',
			},
		],
	},
];
