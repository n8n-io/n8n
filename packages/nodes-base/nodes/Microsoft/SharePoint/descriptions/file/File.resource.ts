import type { INodeProperties } from 'n8n-workflow';

import * as download from './download.operation';
import * as update from './update.operation';
import * as upload from './upload.operation';
import { downloadFilePostReceive, handleErrorPostReceive } from '../../helpers/utils';

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
						url: '=/sites/{{ $parameter["site"] }}/drive/items/{{ $parameter["file"] }}/content',
						json: false,
						encoding: 'arraybuffer',
					},
					output: {
						postReceive: [handleErrorPostReceive, downloadFilePostReceive],
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
						method: 'PATCH',
						url: '=/sites/{{ $parameter["site"] }}/drive/items/{{ $parameter["file"] }}',
					},
					output: {
						postReceive: [handleErrorPostReceive],
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
						method: 'PUT',
						url: '=/sites/{{ $parameter["site"] }}/drive/items/{{ $parameter["folder"] }}:/{{ $parameter["fileName"] }}:/content',
					},
					output: {
						postReceive: [handleErrorPostReceive],
					},
				},
				action: 'Upload file',
			},
		],
		default: 'download',
	},

	...download.description,
	...update.description,
	...upload.description,
];
