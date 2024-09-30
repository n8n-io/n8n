import * as get from './get.operation';
import * as remove from './remove.operation';
import * as upload from './upload.operation';
import * as download from './download.operation';
import * as move from './move.operation';
import * as rename from './rename.operation';
import * as copy from './copy.operation';
import * as lock from './lock.operation';
import * as unlock from './unlock.operation';
import * as history from './history.operation';

import type { INodeProperties } from 'n8n-workflow';

export { get, remove, upload, download, move, rename, copy, lock, unlock, history };

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['files'],
			},
		},
		options: [
			{
				name: 'Copy',
				value: 'copy',
				description: 'Create a copy of an existing file',
				action: 'Copy file',
			},
			{
				name: 'Delete',
				value: 'remove',
				description: 'Delete a file from the library',
				action: 'Delete a file',
			},
			{
				name: 'Download',
				value: 'download',
				description: 'Download a file',
				action: 'Download a file',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Show the details of a file',
				action: 'Get file details',
			},
			{
				name: 'History',
				value: 'history',
				description: 'Get the history of a file with all changes',
				action: 'Get file history',
			},
			{
				name: 'Lock',
				value: 'lock',
				description: 'Set a file to read-only and prevent further changes',
				action: 'Lock a file',
			},
			{
				name: 'Move',
				value: 'move',
				description: 'Move a file to another folder or library',
				action: 'Move a file',
			},
			{
				name: 'Rename',
				value: 'rename',
				description: 'Rename a file',
				action: 'Rename a file',
			},
			{
				name: 'Unlock',
				value: 'unlock',
				description: 'Make a file editable again',
				action: 'Unlock a file',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a file to the Seafile server',
				action: 'Upload a file',
			},
		],
		default: 'upload',
	},
	...get.description,
	...remove.description,
	...upload.description,
	...download.description,
	...move.description,
	...rename.description,
	...copy.description,
	...lock.description,
	...unlock.description,
	...history.description,
];
