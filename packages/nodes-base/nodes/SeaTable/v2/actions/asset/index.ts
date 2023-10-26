import * as upload from './upload';
import * as getPublicURL from './getPublicURL';
import type { INodeProperties } from 'n8n-workflow';

export { upload, getPublicURL };

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['asset'],
			},
		},
		options: [
			{
				name: 'Public URL',
				value: 'getPublicURL',
				description: 'Get the public URL from asset path',
				action: 'Get the public URL from asset path',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Add a file/image to an existing row',
				action: 'Upload a file/image',
			},
		],
		default: 'upload',
	},
	...upload.description,
	...getPublicURL.description,
];
