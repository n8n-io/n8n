import type { INodeProperties } from 'n8n-workflow';

import * as archive from './archive.operation';
import * as create from './create.operation';
import * as deleteInitiative from './delete.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as update from './update.operation';

export { create, deleteInitiative as delete, get, getAll, update, archive };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['initiative'],
			},
		},
		options: [
			{
				name: 'Archive',
				value: 'archive',
				description: 'Archive an initiative',
				action: 'Archive an initiative',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create an initiative',
				action: 'Create an initiative',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an initiative',
				action: 'Delete an initiative',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an initiative',
				action: 'Get an initiative',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many initiatives',
				action: 'Get many initiatives',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an initiative',
				action: 'Update an initiative',
			},
		],
		default: 'getAll',
	},
	...archive.description,
	...create.description,
	...deleteInitiative.description,
	...get.description,
	...getAll.description,
	...update.description,
];
