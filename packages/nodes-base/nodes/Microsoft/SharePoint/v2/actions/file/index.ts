import type { INodeProperties } from 'n8n-workflow';

import * as download from './download.operation';
import * as update from './update.operation';
import * as upload from './upload.operation';

export { download, update, upload };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['file'],
			},
		},
		options: [
			{
				name: 'Download',
				value: 'download',
				description: 'Download a file',
				action: 'Download file',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Rename a file and/or replace its contents',
				action: 'Update file',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a file to a folder',
				action: 'Upload file',
			},
		],
		default: 'upload',
	},

	...download.description,
	...update.description,
	...upload.description,
];
