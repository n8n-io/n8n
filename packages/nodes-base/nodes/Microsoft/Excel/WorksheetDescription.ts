import { INodeProperties } from 'n8n-workflow';

export const worksheetOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'worksheet',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all worksheets',
			},
			{
				name: 'Get Content',
				value: 'getContent',
				description: 'Get worksheet content',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const worksheetFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                                 worksheet:getAll                           */
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
					'getAll',
				],
				resource: [
					'worksheet',
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
					'getAll',
				],
				resource: [
					'worksheet',
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
					'worksheet',
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
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'worksheet',
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
/*                                 worksheet:getContent                       */
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
					'getContent',
				],
				resource: [
					'worksheet',
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
					'getContent',
				],
				resource: [
					'worksheet',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Range',
		name: 'range',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'getContent',
				],
				resource: [
					'worksheet',
				],
			},
		},
		default: 'A1:C3',
		required: true,
		description: 'The address or the name of the range. If not specified, the entire worksheet range is returned.',
	},
	{
		displayName: 'RAW Data',
		name: 'rawData',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getContent',
				],
				resource: [
					'worksheet',
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
					'getContent',
				],
				resource: [
					'worksheet',
				],
				rawData: [
					true,
				],
			},
		},
		description: 'The name of the property into which to write the RAW data.',
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
				operation: [
					'getContent',
				],
				resource: [
					'worksheet',
				],
			},
			hide: {
				rawData: [
					true,
				],
			},
		},
		description: 'Index of the first row which contains the actual data and not the keys. Starts with 0.',
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
				operation: [
					'getContent',
				],
				resource: [
					'worksheet',
				],
			},
			hide: {
				rawData: [
					true,
				],
			},
		},
		default: 0,
		description: 'Index of the row which contains the keys. Starts at 0. The incoming node data is matched to the keys for assignment. The matching is case sensitve.',
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
					'getContent',
				],
				resource: [
					'worksheet',
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
];
