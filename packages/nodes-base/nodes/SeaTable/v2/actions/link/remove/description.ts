import type { LinkProperties } from '../../Interfaces';

export const linkRemoveDescription: LinkProperties = [
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
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
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description:
			'Choose from the list, of specify by using an expression. Provide it in the way "table_name:::table_id".',
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Link Column',
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
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description:
			'Choose from the list of specify the Link Column by using an expression. You have to provide it in the way "column_name:::link_id:::other_table_id".',
	},
	{
		displayName: 'Row ID From the Source Table',
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
		description: 'Provide the row ID of table you selected',
	},
	{
		displayName: 'Row ID From the Target Table',
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
		description: 'Provide the row ID of table you want to link',
	},
];
