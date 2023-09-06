import type { INodeProperties } from 'n8n-workflow';

export const operationProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Read From File',
				value: 'fromFile',
				description: 'Reads data from a spreadsheet file',
				action: 'Read data from a spreadsheet file',
			},
			{
				name: 'Write to File',
				value: 'toFile',
				description: 'Writes the workflow data to a spreadsheet file',
				action: 'Write data to a spreadsheet file',
			},
		],
		default: 'fromFile',
	},
];

export const fromFileProperties: INodeProperties[] = [
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				operation: ['fromFile'],
			},
		},
		placeholder: '',
		description:
			'Name of the binary property from which to read the binary data of the spreadsheet file',
	},
];

export const fromFileV2Properties: INodeProperties[] = [
	{
		displayName: 'File Format',
		name: 'fileFormat',
		type: 'options',
		options: [
			{
				name: 'Autodetect',
				value: 'autodetect',
			},
			{
				name: 'CSV',
				value: 'csv',
				description: 'Comma-separated values',
			},
			{
				name: 'HTML',
				value: 'html',
				description: 'HTML Table',
			},
			{
				name: 'ODS',
				value: 'ods',
				description: 'OpenDocument Spreadsheet',
			},
			{
				name: 'RTF',
				value: 'rtf',
				description: 'Rich Text Format',
			},
			{
				name: 'XLS',
				value: 'xls',
				description: 'Excel',
			},
			{
				name: 'XLSX',
				value: 'xlsx',
				description: 'Excel',
			},
		],
		default: 'autodetect',
		displayOptions: {
			show: {
				operation: ['fromFile'],
			},
		},
		description: 'The format of the binary data to read from',
	},
];

export const toFileProperties: INodeProperties[] = [
	{
		displayName: 'File Format',
		name: 'fileFormat',
		type: 'options',
		options: [
			{
				name: 'CSV',
				value: 'csv',
				description: 'Comma-separated values',
			},
			{
				name: 'HTML',
				value: 'html',
				description: 'HTML Table',
			},
			{
				name: 'ODS',
				value: 'ods',
				description: 'OpenDocument Spreadsheet',
			},
			{
				name: 'RTF',
				value: 'rtf',
				description: 'Rich Text Format',
			},
			{
				name: 'XLS',
				value: 'xls',
				description: 'Excel',
			},
			{
				name: 'XLSX',
				value: 'xlsx',
				description: 'Excel',
			},
		],
		default: 'xls',
		displayOptions: {
			show: {
				operation: ['toFile'],
			},
		},
		description: 'The format of the file to save the data as',
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				operation: ['toFile'],
			},
		},
		placeholder: '',
		description:
			'Name of the binary property in which to save the binary data of the spreadsheet file',
	},
];

export const optionsProperties: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Compression',
				name: 'compression',
				type: 'boolean',
				displayOptions: {
					show: {
						'/operation': ['toFile'],
						'/fileFormat': ['xlsx', 'ods'],
					},
				},
				default: false,
				description: 'Whether compression will be applied or not',
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				displayOptions: {
					show: {
						'/operation': ['toFile'],
					},
				},
				default: '',
				description:
					'File name to set in binary data. By default will "spreadsheet.&lt;fileFormat&gt;" be used.',
			},
			{
				displayName: 'Header Row',
				name: 'headerRow',
				type: 'boolean',
				displayOptions: {
					show: {
						'/operation': ['fromFile', 'toFile'],
					},
				},
				default: true,
				description: 'Whether the first row of the file contains the header names',
			},
			{
				displayName: 'Include Empty Cells',
				name: 'includeEmptyCells',
				type: 'boolean',
				displayOptions: {
					show: {
						'/operation': ['fromFile'],
					},
				},
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'When reading from file the empty cells will be filled with an empty string in the JSON',
			},
			{
				displayName: 'RAW Data',
				name: 'rawData',
				type: 'boolean',
				displayOptions: {
					show: {
						'/operation': ['fromFile'],
					},
				},
				default: false,
				description: 'Whether the data should be returned RAW instead of parsed',
			},
			{
				displayName: 'Read As String',
				name: 'readAsString',
				type: 'boolean',
				displayOptions: {
					show: {
						'/operation': ['fromFile'],
					},
				},
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'In some cases and file formats, it is necessary to read specifically as string else some special character get interpreted wrong',
			},
			{
				displayName: 'Range',
				name: 'range',
				type: 'string',
				displayOptions: {
					show: {
						'/operation': ['fromFile'],
					},
				},
				default: '',
				description:
					'The range to read from the table. If set to a number it will be the starting row. If set to string it will be used as A1-style bounded range.',
			},
			{
				displayName: 'Sheet Name',
				name: 'sheetName',
				type: 'string',
				displayOptions: {
					show: {
						'/operation': ['fromFile'],
					},
				},
				default: 'Sheet',
				description:
					'Name of the sheet to read from in the spreadsheet (if supported). If not set, the first one gets chosen.',
			},
			{
				displayName: 'Sheet Name',
				name: 'sheetName',
				type: 'string',
				displayOptions: {
					show: {
						'/operation': ['toFile'],
						'/fileFormat': ['ods', 'xls', 'xlsx'],
					},
				},
				default: 'Sheet',
				description: 'Name of the sheet to create in the spreadsheet',
			},
		],
	},
];
