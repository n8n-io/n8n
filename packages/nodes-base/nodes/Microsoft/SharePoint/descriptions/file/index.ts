import type { INodeProperties } from 'n8n-workflow';

import * as download from './download.operation';
import * as update from './update.operation';
import * as upload from './upload.operation';

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
				routing: {
					request: {
						method: 'GET',
						url: '/',
					},
					output: {
						postReceive: [],
					},
				},
				action: 'Download file',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a file',
				routing: {
					request: {
						method: 'PUT',
						url: '',
					},
					output: {
						postReceive: [],
					},
				},
				action: 'Update file',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload an existing file',
				routing: {
					request: {
						method: 'POST',
						url: '',
					},
					output: {
						postReceive: [],
					},
				},
				action: 'Upload file',
			},
		],
		default: 'download',
	},

	...download.properties,
	...update.properties,
	...upload.properties,
];
