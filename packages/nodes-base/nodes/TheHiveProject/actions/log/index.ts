import type { INodeProperties } from 'n8n-workflow';

import * as addAttachment from './addAttachment.operation';
import * as create from './create.operation';
import * as deleteAttachment from './deleteAttachment.operation';
import * as executeResponder from './executeResponder.operation';
import * as get from './get.operation';
import * as search from './search.operation';

export { addAttachment, create, deleteAttachment, executeResponder, get, search };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		noDataExpression: true,
		type: 'options',
		required: true,
		default: 'getMany',
		options: [
			{
				name: 'Add Attachment',
				value: 'addAttachment',
				description: 'Add Attachment to a log',
				action: 'Add Attachment to a log',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create task log',
				action: 'Create a log',
			},
			{
				name: 'Delete Attachment',
				value: 'deleteAttachment',
				description: 'Delete attachment from the log',
				action: 'Delete attachment from the log',
			},
			{
				name: 'Execute Responder',
				value: 'executeResponder',
				description: 'Execute a responder on a selected log',
				action: 'Execute a responder',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a single log',
				action: 'Get a log',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search logs',
				action: 'Search logs',
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
	...executeResponder.description,
	...get.description,
	...search.description,
];
