import type { INodeProperties } from 'n8n-workflow';

import * as addAttachment from './addAttachment.operation';
import * as create from './create.operation';
import * as deleteAttachment from './deleteAttachment.operation';
import * as deleteLog from './deleteLog.operation';
import * as executeResponder from './executeResponder.operation';
import * as get from './get.operation';
import * as search from './search.operation';

export { addAttachment, create, deleteAttachment, deleteLog, executeResponder, get, search };

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
				name: 'Add Attachment',
				value: 'addAttachment',
				action: 'Add attachment to a task log',
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a task log',
			},
			{
				name: 'Delete',
				value: 'deleteLog',
				action: 'Delete task log',
			},
			{
				name: 'Delete Attachment',
				value: 'deleteAttachment',
				action: 'Delete attachment from a task log',
			},
			{
				name: 'Execute Responder',
				value: 'executeResponder',
				action: 'Execute responder on a task log',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a task log',
			},
			{
				name: 'Search',
				value: 'search',
				action: 'Search task logs',
			},
		],
		displayOptions: {
			show: {
				resource: ['log'],
			},
		},
	},
	...addAttachment.description,
	...create.description,
	...deleteAttachment.description,
	...deleteLog.description,
	...executeResponder.description,
	...get.description,
	...search.description,
];
