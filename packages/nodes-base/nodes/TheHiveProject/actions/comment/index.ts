import type { INodeProperties } from 'n8n-workflow';

import * as add from './add.operation';
import * as deleteComment from './deleteComment.operation';
import * as update from './update.operation';

export { add, deleteComment, update };

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
				name: 'Add',
				value: 'add',
				action: 'Add a comment to a case or alert',
			},
			{
				name: 'Delete',
				value: 'deleteComment',
				action: 'Delete a comment',
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
	...update.description,
];
