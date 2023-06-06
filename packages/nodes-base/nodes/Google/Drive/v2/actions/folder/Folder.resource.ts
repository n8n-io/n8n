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
				action: 'Create Folder',
			},
			{
				name: 'Delete',
				value: 'deleteFolder',
				description: 'Permanently delete a folder',
				action: 'Delete Folder',
			},
			{
				name: 'Share',
				value: 'share',
				description: 'Add sharing permissions to a folder',
				action: 'Share Folder',
			},
		],
		default: 'create',
	},
	...create.description,
	...deleteFolder.description,
	...share.description,
];
