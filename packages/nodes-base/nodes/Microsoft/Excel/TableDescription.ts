import { INodeProperties } from 'n8n-workflow';
import { tableRLC, workbookRLC, worksheetRLC } from './CommonDescription';

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
				name: 'Add Row',
				value: 'addRow',
				description: 'Add rows to the end of the table',
				action: 'Add a row',
			},
			{
				name: 'Add Table',
				value: 'addTable',
				description: 'Add a table based on range',
				action: 'Add a table',
			},
			{
				name: 'Convert to Range',
				value: 'convertToRange',
				description: 'Convert a table to a range',
				action: 'Convert to range',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a table',
				action: 'Delete a table',
			},
			{
				name: 'Get Columns',
				value: 'getColumns',
				description: 'Retrieve a list of table columns',
				action: 'Get columns',
			},
			{
				name: 'Get Rows',
				value: 'getRows',
				description: 'Retrieve a list of table rows',
				action: 'Get rows',
			},
			{
				name: 'Lookup',
				value: 'lookup',
				description: 'Look for a specific column value and then returns the matching row',
				action: 'Look up a column',
			},
		],
		default: 'addRow',
	},
];

export const tableFields: INodeProperties[] = [
	{
		...workbookRLC,
		displayOptions: {
			show: {
				operation: [
					'addTable',
					'addRow',
					'delete',
					'convertToRange',
					'getRows',
					'getColumns',
					'lookup',
				],
				resource: ['table'],
			},
		},
	},
	{
		...worksheetRLC,
		displayOptions: {
			show: {
				operation: [
					'addTable',
					'addRow',
					'delete',
					'convertToRange',
					'getRows',
					'getColumns',
					'lookup',
				],
				resource: ['table'],
			},
		},
	},
	{
		...tableRLC,
		displayOptions: {
			show: {
				operation: ['addRow', 'delete', 'convertToRange', 'getRows', 'getColumns', 'lookup'],
				resource: ['table'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                 table:addTable                               */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Select Range',
		name: 'selectRange',
		type: 'options',
		options: [
			{
				name: 'Automatically',
				value: 'auto',
			},
			{
				name: 'Manually',
				value: 'manual',
			},
		],
		default: 'auto',
		displayOptions: {
			show: {
				operation: ['addTable'],
				resource: ['table'],
			},
		},
	},
	{
		displayName: 'Range',
		name: 'range',
		type: 'string',
		default: '',
		placeholder: 'A1:B2',
		description: 'The range of cells that will be converted to a table',
		displayOptions: {
			show: {
				operation: ['addTable'],
				resource: ['table'],
				selectRange: ['manual'],
			},
		},
	},
	{
		displayName: 'Has Headers',
		name: 'hasHeaders',
		type: 'boolean',
		default: true,
		description:
			'Whether the range has column labels. When this property set to false Excel will automatically generate header shifting the data down by one row.',
		displayOptions: {
			show: {
				operation: ['addTable'],
				resource: ['table'],
			},
		},
	},

	/* -------------------------------------------------------------------------- */
	/*                                        table:addRow                        */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Options',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Option',
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
					'Specifies the relative position of the new row. If not defined, the addition happens at the end. Any row below the inserted row will be shifted downwards. First row index is 0.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 table:getRows                              */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Return All',
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
		displayName: 'RAW Data',
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
		displayName: 'Data Property',
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
		placeholder: 'Add Filter',
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
				description: 'A comma-separated list of the fields to include in the response',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 table:getColumns                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
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
		displayName: 'RAW Data',
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
		displayName: 'Data Property',
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
		placeholder: 'Add Filter',
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
				description: 'A comma-separated list of the fields to include in the response',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 table:lookup                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Lookup Column',
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
		displayName: 'Lookup Value',
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
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['lookup'],
			},
		},
		options: [
			{
				displayName: 'Return All Matches',
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
