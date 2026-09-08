import type { INodeProperties } from 'n8n-workflow';

export const tableOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['table'],
			},
		},
		options: [
			{
				name: 'Add row',
				value: 'addRow',
				description: 'Adds rows to the end of the table',
				action: 'Add a row',
			},
			{
				name: 'Get columns',
				value: 'getColumns',
				description: 'Retrieve a list of tablecolumns',
				action: 'Get columns',
			},
			{
				name: 'Get rows',
				value: 'getRows',
				description: 'Retrieve a list of tablerows',
				action: 'Get rows',
			},
			{
				name: 'Lookup',
				value: 'lookup',
				description: 'Looks for a specific column value and then returns the matching row',
				action: 'Look up a column',
			},
		],
		default: 'addRow',
	},
];

export const tableFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 table:addRow                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Workbook name or ID',
		name: 'workbook',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getWorkbooks',
		},
		displayOptions: {
			show: {
				operation: ['addRow'],
				resource: ['table'],
			},
		},
		default: '',
	},
	{
		displayName: 'Worksheet name or ID',
		name: 'worksheet',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getworksheets',
			loadOptionsDependsOn: ['workbook'],
		},
		displayOptions: {
			show: {
				operation: ['addRow'],
				resource: ['table'],
			},
		},
		default: '',
	},
	{
		displayName: 'Table name or ID',
		name: 'table',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getTables',
			loadOptionsDependsOn: ['worksheet'],
		},
		displayOptions: {
			show: {
				operation: ['addRow'],
				resource: ['table'],
			},
		},
		default: '',
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				operation: ['addRow'],
				resource: ['table'],
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
				description:
					'Specifies the relative position of the new row. If not defined, the addition happens at the end. Any rows below the inserted row are shifted downwards. Zero-indexed',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 table:getRows                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Workbook name or ID',
		name: 'workbook',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getWorkbooks',
		},
		displayOptions: {
			show: {
				operation: ['getRows'],
				resource: ['table'],
			},
		},
		default: '',
	},
	{
		displayName: 'Worksheet name or ID',
		name: 'worksheet',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getworksheets',
			loadOptionsDependsOn: ['workbook'],
		},
		displayOptions: {
			show: {
				operation: ['getRows'],
				resource: ['table'],
			},
		},
		default: '',
	},
	{
		displayName: 'Table name or ID',
		name: 'table',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getTables',
			loadOptionsDependsOn: ['worksheet'],
		},
		displayOptions: {
			show: {
				operation: ['getRows'],
				resource: ['table'],
			},
		},
		default: '',
	},
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getRows'],
				resource: ['table'],
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
				operation: ['getRows'],
				resource: ['table'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'RAW data',
		name: 'rawData',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getRows'],
				resource: ['table'],
			},
		},
		default: false,
		description:
			'Whether the data should be returned RAW instead of parsed into keys according to their header',
	},
	{
		displayName: 'Data property',
		name: 'dataProperty',
		type: 'string',
		default: 'data',
		displayOptions: {
			show: {
				operation: ['getRows'],
				resource: ['table'],
				rawData: [true],
			},
		},
		description: 'The name of the property into which to write the RAW data',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add filter',
		default: {},
		displayOptions: {
			show: {
				operation: ['getRows'],
				resource: ['table'],
				rawData: [true],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Fields the response will containt. Multiple can be added separated by ,.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 table:getColumns                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Workbook name or ID',
		name: 'workbook',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getWorkbooks',
		},
		displayOptions: {
			show: {
				operation: ['getColumns'],
				resource: ['table'],
			},
		},
		default: '',
	},
	{
		displayName: 'Worksheet name or ID',
		name: 'worksheet',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getworksheets',
			loadOptionsDependsOn: ['workbook'],
		},
		displayOptions: {
			show: {
				operation: ['getColumns'],
				resource: ['table'],
			},
		},
		default: '',
	},
	{
		displayName: 'Table name or ID',
		name: 'table',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getTables',
			loadOptionsDependsOn: ['worksheet'],
		},
		displayOptions: {
			show: {
				operation: ['getColumns'],
				resource: ['table'],
			},
		},
		default: '',
	},
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getColumns'],
				resource: ['table'],
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
				operation: ['getColumns'],
				resource: ['table'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'RAW data',
		name: 'rawData',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getColumns'],
				resource: ['table'],
			},
		},
		default: false,
		description:
			'Whether the data should be returned RAW instead of parsed into keys according to their header',
	},
	{
		displayName: 'Data property',
		name: 'dataProperty',
		type: 'string',
		default: 'data',
		displayOptions: {
			show: {
				operation: ['getColumns'],
				resource: ['table'],
				rawData: [true],
			},
		},
		description: 'The name of the property into which to write the RAW data',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add filter',
		default: {},
		displayOptions: {
			show: {
				operation: ['getColumns'],
				resource: ['table'],
				rawData: [true],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Fields the response will containt. Multiple can be added separated by ,.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 table:lookup                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Workbook name or ID',
		name: 'workbook',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getWorkbooks',
		},
		displayOptions: {
			show: {
				operation: ['lookup'],
				resource: ['table'],
			},
		},
		default: '',
	},
	{
		displayName: 'Worksheet name or ID',
		name: 'worksheet',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getworksheets',
			loadOptionsDependsOn: ['workbook'],
		},
		displayOptions: {
			show: {
				operation: ['lookup'],
				resource: ['table'],
			},
		},
		default: '',
	},
	{
		displayName: 'Table name or ID',
		name: 'table',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getTables',
			loadOptionsDependsOn: ['worksheet'],
		},
		displayOptions: {
			show: {
				operation: ['lookup'],
				resource: ['table'],
			},
		},
		default: '',
	},
	{
		displayName: 'Lookup column',
		name: 'lookupColumn',
		type: 'string',
		default: '',
		placeholder: 'Email',
		required: true,
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['lookup'],
			},
		},
		description: 'The name of the column in which to look for value',
	},
	{
		displayName: 'Lookup value',
		name: 'lookupValue',
		type: 'string',
		default: '',
		placeholder: 'frank@example.com',
		required: true,
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['lookup'],
			},
		},
		description: 'The value to look for in column',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['lookup'],
			},
		},
		options: [
			{
				displayName: 'Return all matches',
				name: 'returnAllMatches',
				type: 'boolean',
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'By default only the first result gets returned. If options gets set all found matches get returned.',
			},
		],
	},
];
