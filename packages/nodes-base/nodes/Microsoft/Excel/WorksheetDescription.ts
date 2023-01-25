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
	/* -------------------------------------------------------------------------- */
	/*                        worksheet:delete, clear                             */
	/* -------------------------------------------------------------------------- */
	{
		...workbookRLC,
		displayOptions: {
			show: {
				operation: ['delete', 'clear'],
				resource: ['worksheet'],
			},
		},
	},
	{
		...worksheetRLC,
		displayOptions: {
			show: {
				operation: ['delete', 'clear'],
				resource: ['worksheet'],
			},
		},
	},
	{
		displayName: 'Apply To',
		name: 'applyTo',
		type: 'options',
		//value in capital case as required by api
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
		placeholder: 'A1:B2',
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
		...workbookRLC,
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['worksheet'],
			},
		},
	},
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
		...workbookRLC,
		displayOptions: {
			show: {
				operation: ['getContent'],
				resource: ['worksheet'],
			},
		},
	},
	{
		...worksheetRLC,
		displayOptions: {
			show: {
				operation: ['getContent'],
				resource: ['worksheet'],
			},
		},
	},
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
		placeholder: 'A1:C3',
		default: '',
		required: true,
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
		description:
			'Index of the first row which contains the actual data and not the keys. Starts with 0. Relative to range.',
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
		description:
			'Index of the row which contains the keys, relative to range. The incoming node data is matched to the keys for assignment. The matching is case sensitve.',
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
];
