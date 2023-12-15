import type { RowProperties } from '../../Interfaces';

export const rowSearchDescription: RowProperties = [
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
				operation: ['search'],
			},
		},
		default: '',
		description:
			'The name of SeaTable table to access. Choose from the list, or specify a name using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Column',
		name: 'searchColumn',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['search'],
			},
		},
		typeOptions: {
			loadOptionsDependsOn: ['tableName'],
			loadOptionsMethod: 'getSearchableColumns',
		},
		required: true,
		default: '',
		description: 'Select the column to be searched. Not all column types are supported for search.',
	},
	{
		displayName: 'Search term',
		name: 'searchTerm',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['search'],
			},
		},
		required: true,
		default: '',
		description: 'What to look for?',
	},
	{
		displayName: 'Case Insensitive Search',
		name: 'insensitive',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['search'],
			},
		},
		default: false,
		description:
			'FALSE: The search distinguish between uppercase and lowercase characters. TRUE: Search ignores case sensitivity.',
	},
	{
		displayName: 'Activate wildcard search',
		name: 'wildcard',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['search'],
			},
		},
		default: false,
		description:
			'FALSE: The search only results perfect matches. TRUE: Finds a row even if the search value is part of a string.',
	},
	{
		displayName: 'Simplify output',
		name: 'simple',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['search'],
			},
		},
		description:
			'Simplified returns only the columns of your base. Non-simplified will return additional columns like _ctime (=creation time), _mtime (=modification time) etc.',
	},
];
