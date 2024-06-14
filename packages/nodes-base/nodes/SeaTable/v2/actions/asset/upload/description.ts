import type { AssetProperties } from '../../Interfaces';

export const assetUploadDescription: AssetProperties = [
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
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
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description:
			'The name of SeaTable table to access. Choose from the list, or specify a name using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Column Name',
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
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description:
			'Select the column for the upload. Choose from the list, or specify the name  using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Row ID',
		name: 'rowId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
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
		displayName: 'Replace Existing File',
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
			'Whether to replace the existing asset with the same name (true). Otherwise, a new version with a different name (numeral in parentheses) will be uploaded (false).',
	},
	{
		displayName: 'Append to Column',
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
			'Whether to keep existing files/images in the column and append the new asset (true). Otherwise, the existing files/images are removed from the column (false).',
	},
];
