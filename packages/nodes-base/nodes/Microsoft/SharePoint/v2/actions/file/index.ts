import type { INodeProperties } from 'n8n-workflow';

import * as upload from './upload.operation';

export { upload };

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
				name: 'Upload',
				value: 'upload',
				description: 'Upload a file to a folder',
				action: 'Upload file',
			},
		],
		default: 'upload',
	},

	...upload.description,
];
