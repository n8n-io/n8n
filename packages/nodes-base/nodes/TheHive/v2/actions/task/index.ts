import type { INodeProperties } from 'n8n-workflow';

import * as count from './count.operation';
import * as create from './create.operation';
import * as executeResponder from './executeResponder.operation';
import * as get from './get.operation';
import * as getMany from './getMany.operation';
import * as search from './search.operation';
import * as update from './update.operation';

export { count, create, executeResponder, get, getMany, search, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		default: 'getMany',
		type: 'options',
		noDataExpression: true,
		required: true,
		options: [
			{
				name: 'Count',
				value: 'count',
				action: 'Count tasks',
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a task',
			},
			{
				name: 'Execute Responder',
				value: 'executeResponder',
				action: 'Execute a responder on the specified task',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a single task',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many asks of a specific case',
			},
			{
				name: 'Search',
				value: 'search',
				action: 'Search tasks',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a task',
			},
		],
		displayOptions: {
			show: {
				resource: ['task'],
			},
		},
	},
	...count.description,
	...create.description,
	...executeResponder.description,
	...get.description,
	...getMany.description,
	...search.description,
	...update.description,
];
