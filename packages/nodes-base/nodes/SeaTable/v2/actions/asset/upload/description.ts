import type { AssetProperties } from '../../Interfaces';

export const assetUploadDescription: AssetProperties = [
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
				resource: ['asset'],
				operation: ['upload'],
			},
		},
		default: '',
		description:
			'The name of SeaTable table to access. Choose from the list, or specify a name using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Column',
		name: 'uploadColumn',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['upload'],
			},
		},
		typeOptions: {
			loadOptionsDependsOn: ['tableName'],
			loadOptionsMethod: 'getAssetColumns',
		},
		required: true,
		default: '',
		description: 'Select the column for the upload.',
	},
	{
		displayName: 'Row ID',
		name: 'rowId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsDependsOn: ['tableName'],
			loadOptionsMethod: 'getRowIds',
		},
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['upload'],
			},
		},
		default: '',
	},
	{
		displayName: 'Property Name',
		name: 'dataPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['upload'],
			},
		},
		description: 'Name of the binary property which contains the data for the file to be written',
	},
	{
		displayName: 'Replace existing file',
		name: 'replace',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['upload'],
			},
		},
		description:
			'Replace existing asset with the same name. Otherwise a new version with another name (numeral in parentheses) will be uploaded.',
	},
	{
		displayName: 'Append to column',
		name: 'append',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['upload'],
			},
		},
		description:
			'Keep existing files/images in the column and append the new asset. Otherwise the existing files/images are remove from the column.',
	},
];
