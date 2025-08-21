import { INodeProperties, updateDisplayOptions } from 'n8n-workflow';
import { RowCreateOptions } from './row_create.options';
import { RowUpdateOptions } from './row_update.options';
import { RowGetAllOptions } from './row_get_all.options';
import { RowGetOptions } from './row_get.options';
import { RowDeleteOptions } from './row_delete.options';
import { RowUpsertOptions } from './row_upsert.options';

const _rowsOptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['row'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a row',
				action: 'Create a row',
			},
			{
				name: 'Create or Update',
				value: 'upsert',
				description: 'Create a new record, or update the current one if it already exists (upsert)',
				action: 'Create or update a row',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a row',
				action: 'Delete a row',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a row',
				action: 'Get a row',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many rows',
				action: 'Get many rows',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a row',
				action: 'Update a row',
			},
		],
		default: 'get',
	},

	// ----------------------------------
	//         Shared
	// ----------------------------------
	{
		displayName: 'Workspace Name or ID',
		name: 'workspaceId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getWorkspaces',
					searchable: true,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'wi0qdp7n',
			},
		],
	},
	{
		displayName: 'Base Name or ID',
		name: 'projectId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsDependsOn: ['workspaceId.value'],
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getBases',
					searchable: true,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'p979g1063032uw4',
			},
		],
	},
	{
		displayName: 'Table Name or ID',
		name: 'table',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description:
			'The table to operate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsDependsOn: ['projectId.value'],
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getTables',
					searchable: true,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'ml0pwy7932yabfg',
			},
		],
	},
];

export const RowsOptions = [
	...updateDisplayOptions(
		{
			show: {
				resource: ['row'],
			},
		},
		_rowsOptions,
	),
	...RowDeleteOptions,
	...RowCreateOptions,
	...RowUpdateOptions,
	...RowUpsertOptions,
	...RowGetAllOptions,
	...RowGetOptions,
];
