import type { LinkProperties } from '../../Interfaces';

export const linkAddDescription: LinkProperties = [
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
				operation: ['add'],
			},
		},
		default: '',
		description: 'If you use an expression, provide it in the way "<table_name>:::<table_id>".',
	},
	{
		displayName: 'Link column',
		name: 'linkColumn',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['link'],
				operation: ['add'],
			},
		},
		typeOptions: {
			loadOptionsDependsOn: ['tableName'],
			loadOptionsMethod: 'getLinkColumns',
		},
		required: true,
		default: '',
		description:
			'If you use an expression, provide it in the way "<column_name>:::<link_id>:::<other_table_id>".',
	},
	{
		displayName: 'Row ID from the source table',
		name: 'linkColumnSourceId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['link'],
				operation: ['add'],
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
				operation: ['add'],
			},
		},
		required: true,
		default: '',
		description: 'Provide the row ID of table you want to link.',
	},
];
