import type { INodeProperties } from 'n8n-workflow';

import * as deleteFile from './deleteFile.operation';
import * as download from './download.operation';
import * as getMany from './getMany.operation';
import * as upload from './upload.operation';

export { deleteFile, download, getMany, upload };

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
				value: download.FIELD,
				description: 'Read a file into execution binary data',
				action: 'Download a file',
			},
			{
				name: 'Upload',
				value: upload.FIELD,
				description: 'Save execution binary data as a project file',
				action: 'Upload a file',
			},
			{
				name: 'Get Many',
				value: getMany.FIELD,
				description: 'List file metadata, without content',
				action: 'Get many files',
			},
			{
				name: 'Delete',
				value: deleteFile.FIELD,
				description: 'Permanently delete a file',
				action: 'Delete a file',
			},
		],
		default: 'download',
	},
	...download.description,
	...upload.description,
	...getMany.description,
	...deleteFile.description,
];
