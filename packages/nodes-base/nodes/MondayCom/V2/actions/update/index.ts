import type { INodeProperties } from 'n8n-workflow';

import * as addFileToUpdate from './addFileToUpdate.operation';
import * as createUpdate from './createUpdate.operation';
import * as getUpdates from './getUpdates.operation';
import * as searchUpdatesAccount from './searchUpdatesAccount.operation';

export { addFileToUpdate, createUpdate, getUpdates, searchUpdatesAccount };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['update'] } },
		options: [
			{
				name: 'Add File',
				value: 'addFileToUpdate',
				action: 'Add a file to an update',
				description: 'Upload a binary file from the workflow as an attachment on an update',
			},
			{
				name: 'Create',
				value: 'createUpdate',
				action: 'Create an update',
				description: 'Post an update on an item, or a reply to an existing update',
			},
			{
				name: 'Get Many',
				value: 'getUpdates',
				action: 'Get many updates',
				description: 'Return updates of one item, or account-wide',
			},
			{
				name: 'Search',
				value: 'searchUpdatesAccount',
				action: 'Search updates',
				description: 'Find updates account-wide by keywords in their body text',
			},
		],
		default: 'createUpdate',
	},
	...addFileToUpdate.description,
	...createUpdate.description,
	...getUpdates.description,
	...searchUpdatesAccount.description,
];
