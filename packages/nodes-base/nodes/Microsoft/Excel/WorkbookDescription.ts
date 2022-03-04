import { INodeProperties } from 'n8n-workflow';

export const workbookOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'workbook',
				],
			},
		},
		options: [
			{
				name: 'Add Worksheet',
				value: 'addWorksheet',
				description: 'Adds a new worksheet to the workbook.',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all workbooks',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const workbookFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                                 workbook:addWorksheet                      */
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
					'addWorksheet',
				],
				resource: [
					'workbook',
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
					'addWorksheet',
				],
				resource: [
					'workbook',
				],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: `The name of the worksheet to be added. If specified, name should be unqiue. If not specified, Excel determines the name of the new worksheet.`,
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 workbook:getAll                            */
/* -------------------------------------------------------------------------- */
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
					'workbook',
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
					'workbook',
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
					'workbook',
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
