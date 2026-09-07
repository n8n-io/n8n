import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteRecord from './delete.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as update from './update.operation';

export { create, deleteRecord as delete, get, getAll, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'getAll',
		noDataExpression: true,
		displayOptions: { show: { resource: ['custom'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new record',
				action: 'Create a record',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a record',
				action: 'Delete a record',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a record',
				action: 'Get a record',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many records',
				action: 'Get many records',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a record',
				action: 'Update a record',
			},
		],
	},
	{
		displayName: 'Resource Name or ID',
		name: 'customResource',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The Odoo model to operate on',
		displayOptions: { show: { resource: ['custom'] } },
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchModels',
					searchable: true,
				},
			},
			{
				displayName: 'By Name',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. res.partner',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[a-z][a-z0-9_.]*',
							errorMessage: 'Not a valid Odoo model name',
						},
					},
				],
			},
		],
	},

	...create.description,
	...deleteRecord.description,
	...get.description,
	...getAll.description,
	...update.description,
];
