import type { RowProperties } from '../../Interfaces';

export const rowListDescription: RowProperties = [
	{
		displayName: 'Table Name',
		name: 'tableName',
		type: 'options',
		placeholder: 'Select a table',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getTableNames',
		},
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['list'],
			},
		},
		default: '',
		description:
			'The name of SeaTable table to access. Choose from the list, or specify a name using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'View Name or ID (optional)',
		name: 'viewName',
		type: 'options',
		required: false,
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['list'],
			},
		},
		typeOptions: {
			loadOptionsDependsOn: ['tableName'],
			loadOptionsMethod: 'getTableViews',
		},
		default: '',
		description: 'The name of SeaTable view to access. Choose from the list, or specify ...',
	},
	{
		displayName: 'Simplify output',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['list'],
			},
		},
		default: true,
		description:
			'Simplified returns only the columns of your base. Non-simplified will return additional columns like _ctime (=creation time), _mtime (=modification time) etc.',
	},
];
