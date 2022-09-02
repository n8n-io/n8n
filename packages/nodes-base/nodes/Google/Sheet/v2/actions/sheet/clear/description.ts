import { SheetProperties } from '../../interfaces';

export const sheetClearDescription: SheetProperties = [
	{
		displayName: 'Clear',
		name: 'clear',
		type: 'options',
		options: [
			{
				name: 'Whole Sheet',
				value: 'wholeSheet',
				description: 'Create a new column for extra data',
			},
			{
				name: 'Specific Rows',
				value: 'specificRows',
				description: 'Ignore extra data',
			},
			{
				name: 'Specific Columns',
				value: 'specificColumns',
				description: 'Throw an error',
			},
			{
				name: 'Specific Range',
				value: 'specificRange',
				description: 'Throw an error',
			},
		],
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['clear'],
			},
			hide: {
				spreadsheetName: [''],
			},
		},
		default: 'wholeSheet',
		description: 'What to clear',
	},
	{
		displayName: 'Start Row Number',
		name: 'startIndex',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 1,
		description: 'The row number to delete from, The first row is 1',
		displayOptions: {
			show: {
				clear: ['specificRows'],
			},
			hide: {
				spreadsheetName: [''],
			},
		},
	},
	{
		displayName: 'Number of Rows to Delete',
		name: 'numberToDelete',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 1,
		displayOptions: {
			show: {
				clear: ['specificRows'],
			},
			hide: {
				spreadsheetName: [''],
			},
		},
	},

	{
		displayName: 'Start Column',
		name: 'startIndex',
		type: 'string',
		default: 'A',
		description: 'The column to delete',
		displayOptions: {
			show: {
				clear: ['specificColumns'],
			},
			hide: {
				spreadsheetName: [''],
			},
		},
	},
	{
		// Could this be better as "end column"?
		displayName: 'Number of Columns to Delete',
		name: 'numberToDelete',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 1,
		displayOptions: {
			show: {
				clear: ['specificColumns'],
			},
			hide: {
				spreadsheetName: [''],
			},
		},
	},
	{
		displayName: 'Range',
		name: 'range',
		type: 'string',
		displayOptions: {
			show: {
				clear: ['specificRange'],
			},
			hide: {
				spreadsheetName: [''],
			},
		},
		default: 'A:F',
		required: true,
		description:
			'The table range to read from or to append data to. See the Google <a href="https://developers.google.com/sheets/api/guides/values#writing">documentation</a> for the details. If it contains multiple sheets it can also be added like this: "MySheet!A:F"',
	},
];
