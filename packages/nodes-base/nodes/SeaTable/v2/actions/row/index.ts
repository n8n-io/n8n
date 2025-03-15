import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as get from './get.operation';
import * as list from './list.operation';
import * as lock from './lock.operation';
import * as remove from './remove.operation';
import * as search from './search.operation';
import { sharedProperties } from './sharedProperties';
import * as unlock from './unlock.operation';
import * as update from './update.operation';

export { create, get, search, update, remove, lock, unlock, list };

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['row'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new row',
				action: 'Create a row',
			},
			{
				name: 'Delete',
				value: 'remove',
				description: 'Delete a row',
				action: 'Delete a row',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get the content of a row',
				action: 'Get a row',
			},
			{
				name: 'Get Many',
				value: 'list',
				description: 'Get many rows from a table or a table view',
				action: 'Get many rows',
			},
			{
				name: 'Lock',
				value: 'lock',
				description: 'Lock a row to prevent further changes',
				action: 'Add a row lock',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search one or multiple rows',
				action: 'Search a row by keyword',
			},
			{
				name: 'Unlock',
				value: 'unlock',
				description: 'Remove the lock from a row',
				action: 'Remove a row lock',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update the content of a row',
				action: 'Update a row',
			},
		],
		default: 'create',
	},
	...sharedProperties,
	...create.description,
	...get.description,
	...list.description,
	...search.description,
	...update.description,
];
