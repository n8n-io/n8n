import { INodeProperties } from 'n8n-workflow';
import { workbookRLC, worksheetRLC } from './CommonDescription';

export const worksheetOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['worksheet'],
			},
		},
		options: [
			{
				name: 'Append',
				value: 'append',
				description: 'Append data to worksheet',
				action: 'Append data to worksheet',
			},
			{
				name: 'Clear',
				value: 'clear',
				description: 'Clear worksheet',
				action: 'Clear worksheet',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete worksheet',
				action: 'Delete worksheet',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get worksheets',
				action: 'Get worksheets',
			},
			{
				name: 'Get Range',
				value: 'getContent',
				description: 'Get worksheet range',
				action: 'Get worksheet range',
			},
			{
				name: 'Update Range',
				value: 'updateRange',
				description: 'Update worksheet range',
				action: 'Update worksheet range',
			},
		],
		default: 'getAll',
	},
];

export const worksheetFields: INodeProperties[] = [
	{
		...workbookRLC,
		displayOptions: {
			show: {
				operation: ['append', 'delete', 'clear', 'getAll', 'getContent', 'updateRange'],
				resource: ['worksheet'],
			},
		},
	},
	{
		...worksheetRLC,
		displayOptions: {
			show: {
				operation: ['append', 'delete', 'clear', 'getContent', 'updateRange'],
				resource: ['worksheet'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                 worksheet:append                           */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Data Mode',
		name: 'dataMode',
		type: 'options',
		default: 'raw',
		options: [
			{
				name: 'Auto-Map',
				value: 'autoMap',
			},
			{
				name: 'Raw',
				value: 'raw',
			},
		],
		displayOptions: {
			show: {
				operation: ['append'],
				resource: ['worksheet'],
			},
		},
	},
	{
		displayName: 'Data',
		name: 'data',
		type: 'json',
		default: '',
		required: true,
		placeholder: 'e.g. [["Hello", "100"],["1/1/2016", null]]',
		description: 'Raw values for the specified range as array of string arrays in JSON format',
		displayOptions: {
			show: {
				operation: ['append'],
				resource: ['worksheet'],
				dataMode: ['raw'],
			},
		},
	},
	{
		displayName: 'RAW Data',
		name: 'rawData',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['append'],
				resource: ['worksheet'],
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
		required: true,
		displayOptions: {
			show: {
				operation: ['append'],
				resource: ['worksheet'],
				rawData: [true],
			},
		},
		description: 'The name of the property into which to write the RAW data',
	},
	/* -------------------------------------------------------------------------- */
	/*                        worksheet: clear                                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Apply To',
		name: 'applyTo',
		type: 'options',
		//values in capital case as required by api
		options: [
			{
				name: 'All',
				value: 'All',
			},
			{
				name: 'Formats',
				value: 'Formats',
			},
			{
				name: 'Contents',
				value: 'Contents',
			},
		],
		default: 'All',
		displayOptions: {
			show: {
				operation: ['clear'],
				resource: ['worksheet'],
			},
		},
	},
	{
		displayName: 'Select Range',
		name: 'selectRange',
		type: 'options',
		options: [
			{
				name: 'Whole Worksheet',
				value: 'whole',
			},
			{
				name: 'Specify',
				value: 'specify',
			},
		],
		default: 'whole',
		displayOptions: {
			show: {
				operation: ['clear'],
				resource: ['worksheet'],
			},
		},
	},
	{
		displayName: 'Range',
		name: 'range',
		type: 'string',
		default: '',
		placeholder: 'e.g. A1:B2',
		description: 'The range of cells that will be cleared',
		displayOptions: {
			show: {
				operation: ['clear'],
				resource: ['worksheet'],
				selectRange: ['specify'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                 worksheet:getAll                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['worksheet'],
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
				operation: ['getAll'],
				resource: ['worksheet'],
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
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['worksheet'],
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
	/*                                 worksheet:getContent                       */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Range',
		name: 'range',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['getContent'],
				resource: ['worksheet'],
			},
		},
		placeholder: 'e.g. A1:B2',
		default: '',
		description: 'The address or the name of the range',
		hint: 'Leave blank to return entire worksheet',
	},
	{
		displayName: 'RAW Data',
		name: 'rawData',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getContent'],
				resource: ['worksheet'],
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
				operation: ['getContent'],
				resource: ['worksheet'],
				rawData: [true],
			},
		},
		description: 'The name of the property into which to write the RAW data',
	},
	{
		displayName: 'Key Row',
		name: 'keyRow',
		type: 'number',
		typeOptions: {
			minValue: 0,
		},
		displayOptions: {
			show: {
				operation: ['getContent'],
				resource: ['worksheet'],
			},
			hide: {
				rawData: [true],
			},
		},
		default: 0,
		hint: "Index of the row which contains column names. Relative to 'Range'.",
		description:
			'The incoming node data is matched to the keys for assignment. The matching is case sensitve.',
	},
	{
		displayName: 'Data Start Row',
		name: 'dataStartRow',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 1,
		displayOptions: {
			show: {
				operation: ['getContent'],
				resource: ['worksheet'],
			},
			hide: {
				rawData: [true],
			},
		},
		hint: "Index of first row which contains the actual data. Relative to 'Range'.",
	},

	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				operation: ['getContent'],
				resource: ['worksheet'],
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
	/*                                 worksheet:updateRange                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Range',
		name: 'range',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['updateRange'],
				resource: ['worksheet'],
				dataMode: ['autoMap'],
			},
		},
		placeholder: 'e.g. A1:B2',
		default: '',
		description: 'The address or the name of the range',
		hint: 'First row must contain column names. Leave blank for entire worksheet.',
	},
	{
		displayName: 'Range',
		name: 'range',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['updateRange'],
				resource: ['worksheet'],
				dataMode: ['raw'],
			},
		},
		placeholder: 'e.g. A1:B2',
		default: '',
		description: 'The address or the name of the range',
		hint: 'Leave blank for entire worksheet',
	},
	{
		displayName: 'Data Mode',
		name: 'dataMode',
		type: 'options',
		default: 'raw',
		options: [
			{
				name: 'Auto-Map',
				value: 'autoMap',
			},
			{
				name: 'Raw',
				value: 'raw',
			},
		],
		displayOptions: {
			show: {
				operation: ['updateRange'],
				resource: ['worksheet'],
			},
		},
	},
	{
		displayName: 'Data',
		name: 'data',
		type: 'json',
		default: '',
		required: true,
		placeholder: 'e.g. [["Hello", "100"],["1/1/2016", null]]',
		description:
			'Raw values for the specified range as array of string arrays in JSON format. Should match specified range.',
		displayOptions: {
			show: {
				operation: ['updateRange'],
				resource: ['worksheet'],
				dataMode: ['raw'],
			},
		},
	},
	{
		displayName: 'Column to Match On',
		name: 'columnToMatchOn',
		type: 'string',
		default: '',
		placeholder: 'e.g. ID',
		required: true,
		displayOptions: {
			show: {
				operation: ['updateRange'],
				resource: ['worksheet'],
				dataMode: ['autoMap'],
			},
		},
	},
	{
		displayName: 'RAW Data',
		name: 'rawData',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['updateRange'],
				resource: ['worksheet'],
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
		required: true,
		displayOptions: {
			show: {
				operation: ['updateRange'],
				resource: ['worksheet'],
				rawData: [true],
			},
		},
		description: 'The name of the property into which to write the RAW data',
	},
];
