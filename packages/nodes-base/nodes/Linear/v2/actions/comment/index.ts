import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteComment from './delete.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as update from './update.operation';

export { create, deleteComment as delete, get, getAll, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['comment'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a comment',
				action: 'Create a comment',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a comment',
				action: 'Delete a comment',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a comment',
				action: 'Get a comment',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get comments for an issue',
				action: 'Get many comments',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a comment',
				action: 'Update a comment',
			},
		],
		default: 'create',
	},
	...create.description,
	...deleteComment.description,
	...get.description,
	...getAll.description,
	...update.description,
];
