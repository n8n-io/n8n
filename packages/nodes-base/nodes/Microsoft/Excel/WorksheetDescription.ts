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
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many worksheets',
				action: 'Get many worksheets',
			},
			{
				name: 'Get Content',
				value: 'getContent',
				description: 'Get worksheet content',
				action: 'Get a worksheet',
			},
		],
		default: 'getAll',
	},
];

export const worksheetFields: INodeProperties[] = [
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
