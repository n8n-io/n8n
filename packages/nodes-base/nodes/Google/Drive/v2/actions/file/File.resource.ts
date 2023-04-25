import type { INodeProperties } from 'n8n-workflow';
import { fileRLC } from '../common.descriptions';

import * as copy from './copy.operation';
import * as createFromText from './createFromText.operation';
import * as deleteFile from './deleteFile.operation';
import * as download from './download.operation';
import * as move from './move.operation';
import * as share from './share.operation';
import * as update from './update.operation';
import * as upload from './upload.operation';

export { copy, createFromText, deleteFile, download, move, share, update, upload };

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
				name: 'Copy',
				value: 'copy',
				description: 'Copy a file',
				action: 'Copy a file',
			},
			{
				name: 'Create From Text',
				value: 'createFromText',
				description: 'Create a file from text',
				action: 'Create a file from text',
			},
			{
				name: 'Delete',
				value: 'deleteFile',
				description: 'Delete a file',
				action: 'Delete a file',
			},
			{
				name: 'Download',
				value: 'download',
				description: 'Download a file',
				action: 'Download a file',
			},
			{
				name: 'Move',
				value: 'move',
				description: 'Move a file',
				action: 'Move a file',
			},
			{
				name: 'Share',
				value: 'share',
				description: 'Share a file',
				action: 'Share a file',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a file',
				action: 'Update a file',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a file',
				action: 'Upload a file',
			},
		],
		default: 'upload',
	},
	{
		...fileRLC,
		displayOptions: {
			show: {
				operation: ['download', 'update', 'deleteFile'],
				resource: ['file'],
			},
		},
	},
	...copy.description,
	...deleteFile.description,
	...createFromText.description,
	...download.description,
	...move.description,
	...share.description,
	...update.description,
	...upload.description,
];
