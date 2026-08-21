import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteMilestone from './delete.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as update from './update.operation';

export { create, deleteMilestone as delete, get, getAll, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['projectMilestone'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a milestone',
				action: 'Create a milestone',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a milestone',
				action: 'Delete a milestone',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a milestone',
				action: 'Get a milestone',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many milestones',
				action: 'Get many milestones',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a milestone',
				action: 'Update a milestone',
			},
		],
		default: 'getAll',
	},
	...create.description,
	...deleteMilestone.description,
	...get.description,
	...getAll.description,
	...update.description,
];
