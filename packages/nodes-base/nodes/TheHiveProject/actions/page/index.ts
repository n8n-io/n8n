import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deletePage from './deletePage.operation';
import * as search from './search.operation';
import * as update from './update.operation';

export { create, deletePage, search, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		noDataExpression: true,
		type: 'options',
		required: true,
		default: 'create',
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a page',
			},
			{
				name: 'Delete',
				value: 'deletePage',
				action: 'Delete a page',
			},
			{
				name: 'Search',
				value: 'search',
				action: 'Search pages',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a page',
			},
		],
		displayOptions: {
			show: {
				resource: ['page'],
			},
		},
	},
	...create.description,
	...deletePage.description,
	...search.description,
	...update.description,
];
