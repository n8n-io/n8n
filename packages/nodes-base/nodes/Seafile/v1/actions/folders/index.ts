import * as create from './create.operation';
import * as remove from './remove.operation';
import * as list from './list.operation';

import type { INodeProperties } from 'n8n-workflow';

export { create, remove, list };

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['folders'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a folder in a library',
				action: 'Create a folder',
			},
			{
				name: 'Delete',
				value: 'remove',
				description: 'Delete a folder in a library and move it to trash',
				action: 'Delete a folder',
			},
			{
				name: 'List',
				value: 'list',
				description: 'Returns the files and folders in a given folder',
				action: 'List a folder',
			},
		],
		default: 'create',
	},
	...create.description,
	...remove.description,
	...list.description,
];
