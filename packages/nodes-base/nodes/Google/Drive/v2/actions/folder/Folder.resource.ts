import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteFolder from './deleteFolder.operation';
import * as share from './share.operation';

export { create, deleteFolder, share };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['folder'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a folder',
				action: 'Create a folder',
			},
			{
				name: 'Delete',
				value: 'deleteFolder',
				description: 'Delete a folder',
				action: 'Delete a folder',
			},
			{
				name: 'Share',
				value: 'share',
				description: 'Share a folder',
				action: 'Share a folder',
			},
		],
		default: 'create',
	},
	...create.description,
	...deleteFolder.description,
	...share.description,
];
