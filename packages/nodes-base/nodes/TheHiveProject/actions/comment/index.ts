import type { INodeProperties } from 'n8n-workflow';

import * as add from './add.operation';
import * as deleteComment from './deleteComment.operation';
import * as search from './search.operation';
import * as update from './update.operation';

export { add, deleteComment, search, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		noDataExpression: true,
		type: 'options',
		required: true,
		default: 'add',
		options: [
			{
				name: 'Create',
				value: 'add',
				action: 'Create a comment in a case or alert',
			},
			{
				name: 'Delete',
				value: 'deleteComment',
				action: 'Delete a comment',
			},
			{
				name: 'Search',
				value: 'search',
				action: 'Search comments',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a comment',
			},
		],
		displayOptions: {
			show: {
				resource: ['comment'],
			},
		},
	},
	...add.description,
	...deleteComment.description,
	...search.description,
	...update.description,
];
