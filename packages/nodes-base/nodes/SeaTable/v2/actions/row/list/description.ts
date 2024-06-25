import type { RowProperties } from '../../Interfaces';

export const rowListDescription: RowProperties = [
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Table Name',
		name: 'tableName',
		type: 'options',
		placeholder: 'Select a table',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getTableNameAndId',
		},
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['list'],
			},
		},
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description:
			'Choose from the list, or specify by using an expression. Provide it in the way "table_name:::table_id".',
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'View Name',
		name: 'viewName',
		type: 'options',
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
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description:
			'The name of SeaTable view to access, or specify by using an expression. Provide it in the way "col.name:::col.type".',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['list'],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
];
