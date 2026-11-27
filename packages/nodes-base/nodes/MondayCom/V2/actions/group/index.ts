import type { INodeProperties } from 'n8n-workflow';

import * as archiveOrDeleteGroup from './archiveOrDeleteGroup.operation';
import * as createGroup from './createGroup.operation';
import * as duplicateGroup from './duplicateGroup.operation';
import * as getGroups from './getGroups.operation';
import * as updateGroup from './updateGroup.operation';

export { archiveOrDeleteGroup, createGroup, duplicateGroup, getGroups, updateGroup };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['group'] } },
		options: [
			{
				name: 'Archive or Delete',
				value: 'archiveOrDeleteGroup',
				action: 'Archive or delete a board group',
				description: 'Archive a group (recoverable, the default) or permanently delete it',
			},
			{
				name: 'Create',
				value: 'createGroup',
				action: 'Create a board group',
				description: 'Create a new group on a board',
			},
			{
				name: 'Duplicate',
				value: 'duplicateGroup',
				action: 'Duplicate a board group',
				description: 'Create a copy of a group with its items on the same board',
			},
			{
				name: 'Get Many',
				value: 'getGroups',
				action: 'Get many board groups',
				description: 'Return the groups of a board',
			},
			{
				name: 'Update',
				value: 'updateGroup',
				action: 'Update a board group',
				description: 'Change the title, color, or position of an existing group',
			},
		],
		default: 'getGroups',
	},
	...archiveOrDeleteGroup.description,
	...createGroup.description,
	...duplicateGroup.description,
	...getGroups.description,
	...updateGroup.description,
];
