import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteDrive from './deleteDrive.operation';
import * as get from './get.operation';
import * as list from './list.operation';
import * as update from './update.operation';
import { sharedDriveRLC } from '../common.descriptions';

export { create, deleteDrive, get, list, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a drive',
				action: 'Create a drive',
			},
			{
				name: 'Delete',
				value: 'deleteDrive',
				description: 'Delete a drive',
				action: 'Delete a drive',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a drive',
				action: 'Get a drive',
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all shared drives',
				action: 'List all shared drives',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a drive',
				action: 'Update a drive',
			},
		],
		default: 'create',
		displayOptions: {
			show: {
				resource: ['drive'],
			},
		},
	},
	{
		...sharedDriveRLC,
		displayOptions: {
			show: {
				operation: ['deleteDrive', 'get', 'update'],
				resource: ['drive'],
			},
		},
	},
	...create.description,
	...deleteDrive.description,
	...get.description,
	...list.description,
	...update.description,
];
