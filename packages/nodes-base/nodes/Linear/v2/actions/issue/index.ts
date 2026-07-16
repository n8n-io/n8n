import type { INodeProperties } from 'n8n-workflow';

import * as archive from './archive.operation';
import * as create from './create.operation';
import * as deleteIssue from './delete.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as search from './search.operation';
import * as unarchive from './unarchive.operation';
import * as update from './update.operation';

export { archive, create, deleteIssue as delete, get, getAll, search, unarchive, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['issue'],
			},
		},
		options: [
			{
				name: 'Archive',
				value: 'archive',
				description: 'Archive an issue',
				action: 'Archive an issue',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create an issue',
				action: 'Create an issue',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an issue',
				action: 'Delete an issue',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an issue',
				action: 'Get an issue',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many issues',
				action: 'Get many issues',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search issues by text',
				action: 'Search issues',
			},
			{
				name: 'Unarchive',
				value: 'unarchive',
				description: 'Unarchive an issue',
				action: 'Unarchive an issue',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an issue',
				action: 'Update an issue',
			},
		],
		default: 'create',
	},
	...archive.description,
	...create.description,
	...deleteIssue.description,
	...get.description,
	...getAll.description,
	...search.description,
	...unarchive.description,
	...update.description,
];
