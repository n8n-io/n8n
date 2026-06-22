import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteOrganization from './delete.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as search from './search.operation';
import * as update from './update.operation';

export { create, deleteOrganization as delete, get, getAll, search, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['organization'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an organization',
				action: 'Create an organization',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an organization',
				action: 'Delete an organization',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an organization',
				action: 'Get an organization',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many organizations',
				action: 'Get many organizations',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search organizations',
				action: 'Search organizations',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an organization',
				action: 'Update an organization',
			},
		],
		default: 'create',
	},
	...create.description,
	...deleteOrganization.description,
	...get.description,
	...getAll.description,
	...search.description,
	...update.description,
];
