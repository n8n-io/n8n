import type { LinkProperties } from '../../Interfaces';

export const linkRemoveDescription: LinkProperties = [
	{
		displayName: 'Table Name (Source)',
		name: 'tableName',
		type: 'options',
		placeholder: 'Name of table',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getTableNameAndId',
		},
		displayOptions: {
			show: {
				resource: ['link'],
				operation: ['remove'],
			},
		},
		default: '',
		description:
			'The name of SeaTable table to access. Choose from the list, or specify a name using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Link column',
		name: 'linkColumn',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['link'],
				operation: ['remove'],
			},
		},
		typeOptions: {
			loadOptionsDependsOn: ['tableName'],
			loadOptionsMethod: 'getLinkColumns',
		},
		required: true,
		default: '',
		description: 'Select the column to create a link.',
	},
	{
		displayName: 'Row ID from the source table',
		name: 'linkColumnSourceId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['link'],
				operation: ['remove'],
			},
		},
		required: true,
		default: '',
		description: 'Provide the row ID of table you selected.',
	},
	{
		displayName: 'Row ID from the target',
		name: 'linkColumnTargetId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['link'],
				operation: ['remove'],
			},
		},
		required: true,
		default: '',
		description: 'Provide the row ID of table you want to link.',
	},
];
