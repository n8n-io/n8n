import {
	SheetProperties,
} from '../../interfaces';

export const sheetDeleteDescription: SheetProperties = [
	{
		displayName: 'To Delete',
		name: 'toDelete',
		type: 'options',
		options: [
			{
				name: 'Rows',
				value: 'rows',
				description: 'Rows to delete',
			},
			{
				name: 'Columns',
				value: 'columns',
				description: 'Columns to delete',
			},
		],
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
		default: 'rows',
		description: 'What to delete',
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
				resource: [
					'sheet',
				],
				operation: [
					'delete',
				],
				toDelete: [
					'rows',
				],
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
				resource: [
					'sheet',
				],
				operation: [
					'delete',
				],
				toDelete: [
					'rows',
				],
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
				resource: [
					'sheet',
				],
				operation: [
					'delete',
				],
				toDelete: [
					'columns',
				],
			},
		},
	},
	{
		displayName: 'Number of Columns to Delete',
		name: 'numberToDelete',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 1,
		displayOptions: {
			show: {
				resource: [
					'sheet',
				],
				operation: [
					'delete',
				],
				toDelete: [
					'columns',
				],
			},
		},
	},
];
