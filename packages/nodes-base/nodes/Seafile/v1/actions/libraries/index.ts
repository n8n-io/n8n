import * as create from './create.operation';
import * as list from './list.operation';
import * as get from './get.operation';
import * as remove from './remove.operation';

import type { INodeProperties } from 'n8n-workflow';

export { create, list, get, remove };

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['libraries'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new library',
				action: 'Create a library',
			},
			{
				name: 'Delete',
				value: 'remove',
				description: 'Delete a libary and move it to trash',
				action: 'Delete a library',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Show more details about a library',
				action: 'Get a library',
			},
			{
				name: 'List',
				value: 'list',
				description: 'Returns all libraries the user has access to',
				action: 'List all libraries',
			},
		],
		default: 'list',
	},
	...create.description,
	...list.description,
	...get.description,
	...remove.description,
];
