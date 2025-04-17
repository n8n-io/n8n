import type { INodeProperties } from 'n8n-workflow';

export const operationProperty: INodeProperties = {
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
};

export const binaryProperty: INodeProperties = {
	displayName: 'Input Binary Field',
	name: 'binaryPropertyName',
	type: 'string',
	default: 'data',
	required: true,
	placeholder: '',
	hint: 'The name of the input field containing the file data to be processed',
	displayOptions: {
		show: {
			operation: ['fromFile'],
		},
	},
};

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
		displayName: 'Put Output File in Field',
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
		hint: 'The name of the output binary field to put the file in',
	},
];

export const toFileOptions: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	placeholder: 'Add option',
	default: {},
	displayOptions: {
		show: {
			operation: ['toFile'],
		},
	},
	options: [
		{
			displayName: 'Compression',
			name: 'compression',
			type: 'boolean',
			displayOptions: {
				show: {
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
			default: '',
			description:
				'File name to set in binary data. By default will "spreadsheet.&lt;fileFormat&gt;" be used.',
		},
		{
			displayName: 'Header Row',
			name: 'headerRow',
			type: 'boolean',
			default: true,
			description: 'Whether the first row of the file contains the header names',
		},
		{
			displayName: 'Sheet Name',
			name: 'sheetName',
			type: 'string',
			displayOptions: {
				show: {
					'/fileFormat': ['ods', 'xls', 'xlsx'],
				},
			},
			default: 'Sheet',
			description: 'Name of the sheet to create in the spreadsheet',
		},
	],
};

export const fromFileOptions: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	placeholder: 'Add option',
	default: {},
	displayOptions: {
		show: {
			operation: ['fromFile'],
		},
	},
	options: [
		{
			displayName: 'Delimiter',
			name: 'delimiter',
			type: 'string',
			displayOptions: {
				show: {
					'/fileFormat': ['csv'],
				},
			},
			default: ',',
			placeholder: 'e.g. ,',
			description: 'Set the field delimiter, usually a comma',
		},
		{
			displayName: 'Encoding',
			name: 'encoding',
			type: 'options',
			displayOptions: {
				show: {
					'/fileFormat': ['csv'],
				},
			},
			options: [
				{ name: 'ASCII', value: 'ascii' },
				{ name: 'Latin1', value: 'latin1' },
				{ name: 'UCS-2', value: 'ucs-2' },
				{ name: 'UCS2', value: 'ucs2' },
				{ name: 'UTF-8', value: 'utf-8' },
				{ name: 'UTF16LE', value: 'utf16le' },
				{ name: 'UTF8', value: 'utf8' },
			],
			default: 'utf-8',
		},
		{
			displayName: 'Exclude Byte Order Mark (BOM)',
			name: 'enableBOM',
			type: 'boolean',
			displayOptions: {
				show: {
					'/fileFormat': ['csv'],
				},
			},
			default: false,
			description:
				'Whether to detect and exclude the byte-order-mark from the CSV Input if present',
		},
		{
			displayName: 'Preserve Quotes',
			name: 'relaxQuotes',
			type: 'boolean',
			displayOptions: {
				show: {
					'/fileFormat': ['csv'],
				},
			},
			default: false,
			description:
				"Whether to handle unclosed quotes in CSV fields as part of the field's content instead of throwing a parsing error",
		},
		{
			displayName: 'Header Row',
			name: 'headerRow',
			type: 'boolean',
			default: true,
			description: 'Whether the first row of the file contains the header names',
		},
		{
			displayName: 'Include Empty Cells',
			name: 'includeEmptyCells',
			type: 'boolean',
			default: false,
			description:
				'Whether to include empty cells when reading from file. They will be filled with an empty string.',
		},
		{
			displayName: 'Max Number of Rows to Load',
			name: 'maxRowCount',
			type: 'number',
			displayOptions: {
				show: {
					'/fileFormat': ['csv'],
				},
			},
			default: -1,
			placeholder: 'e.g. 10',
			description:
				'Stop handling records after the requested number of rows are read. Use -1 if you want to load all rows.',
		},
		{
			displayName: 'Range',
			name: 'range',
			type: 'string',
			default: '',
			description:
				'The range to read from the table. If set to a number it will be the starting row. If set to string it will be used as A1-style notation range.',
		},
		{
			displayName: 'RAW Data',
			name: 'rawData',
			type: 'boolean',
			default: false,
			description: 'Whether to return RAW data, instead of parsing it',
		},
		{
			displayName: 'Read As String',
			name: 'readAsString',
			type: 'boolean',
			default: false,
			// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
			description:
				'In some cases and file formats, it is necessary to read as string to ensure special characters are interpreted correctly',
		},
		{
			displayName: 'Sheet Name',
			name: 'sheetName',
			type: 'string',
			default: 'Sheet',
			placeholder: 'e.g. mySheet',
			description:
				'Name of the sheet to read from in the spreadsheet (if supported). If not set, the first one will be chosen.',
		},
		{
			displayName: 'Starting Line',
			name: 'fromLine',
			type: 'number',
			displayOptions: {
				show: {
					'/fileFormat': ['csv'],
				},
			},
			default: 0,
			placeholder: 'e.g. 0',
			description: 'Start handling records from the requested line number. Starts at 0.',
		},
	],
};
