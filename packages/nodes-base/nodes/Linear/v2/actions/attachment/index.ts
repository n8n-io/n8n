import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteAttachment from './delete.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';

export { create, deleteAttachment as delete, get, getAll };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['attachment'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an attachment',
				action: 'Create an attachment',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an attachment',
				action: 'Delete an attachment',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an attachment',
				action: 'Get an attachment',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get attachments for an issue',
				action: 'Get many attachments',
			},
		],
		default: 'getAll',
	},
	...create.description,
	...deleteAttachment.description,
	...get.description,
	...getAll.description,
];
