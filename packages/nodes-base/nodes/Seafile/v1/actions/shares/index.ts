import * as internal from './internal.operation';
import * as list_down from './list_down.operation';
import * as list_up from './list_up.operation';
import * as create_down from './create_down.operation';
import * as create_up from './create_up.operation';
import * as remove_down from './remove_down.operation';
import * as remove_up from './remove_up.operation';

import type { INodeProperties } from 'n8n-workflow';

export { internal, list_down, list_up, create_down, create_up, remove_down, remove_up };

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['share'],
			},
		},
		options: [
			{
				name: 'Download Link: Create',
				value: 'create_down',
				description: 'Create a download link for a file or folder',
				action: 'Create a download link',
			},
			{
				name: 'Download Link: Delete',
				value: 'remove_down',
				description: 'Delete a download link',
				action: 'Delete a download link',
			},
			{
				name: 'Download Link: List',
				value: 'list_down',
				description: 'List all download links in a library',
				action: 'List download links',
			},
			{
				name: 'Internal Link: Get',
				value: 'internal',
				description: 'Get an internal link for a file',
				action: 'Get an internal link',
			},
			{
				name: 'Upload Link: Create',
				value: 'create_up',
				description: 'Create an upload link',
				action: 'Create an upload link',
			},
			{
				name: 'Upload Link: Delete',
				value: 'remove_up',
				description: 'Delete an upload link',
				action: 'Delete an upload link',
			},
			{
				name: 'Upload Link: List',
				value: 'list_up',
				description: 'List all upload links in a library',
				action: 'List upload links',
			},
		],
		default: 'internal',
	},
	...internal.description,
	...list_down.description,
	...list_up.description,
	...create_down.description,
	...create_up.description,
	...remove_down.description,
	...remove_up.description,
];
