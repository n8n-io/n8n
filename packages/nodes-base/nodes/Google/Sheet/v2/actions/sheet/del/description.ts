import {
	SheetProperties,
} from '../../interfaces';

export const sheetDeleteDescription: SheetProperties = [
	{
		displayName: 'To Delete',
		name: 'toDelete',
		placeholder: 'Add Columns/Rows to delete',
		description: 'Deletes columns and rows from a sheet',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'sheet',
				],
				operation: [
					'delete',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Columns',
				name: 'columns',
				values: [
					{
						displayName: 'Sheet Name or ID',
						name: 'sheetId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getSheets',
						},
						options: [],
						default: '',
						required: true,
						description: 'The sheet to delete columns from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
					},
					{
						displayName: 'Start Index',
						name: 'startIndex',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 0,
						description: 'The start index (0 based and inclusive) of column to delete',
					},
					{
						displayName: 'Amount',
						name: 'amount',
						type: 'number',
						typeOptions: {
							minValue: 1,
						},
						default: 1,
						description: 'Number of columns to delete',
					},
				],
			},
			{
				displayName: 'Rows',
				name: 'rows',
				values: [
					{
						displayName: 'Sheet Name or ID',
						name: 'sheetId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getSheets',
						},
						options: [],
						default: '',
						required: true,
						description: 'The sheet to delete columns from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
					},
					{
						displayName: 'Start Index',
						name: 'startIndex',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 0,
						description: 'The start index (0 based and inclusive) of row to delete',
					},
					{
						displayName: 'Amount',
						name: 'amount',
						type: 'number',
						typeOptions: {
							minValue: 1,
						},
						default: 1,
						description: 'Number of rows to delete',
					},
				],
			},
		],
	},
];
