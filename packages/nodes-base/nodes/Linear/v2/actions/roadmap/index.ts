import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteRoadmap from './delete.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as update from './update.operation';

export { create, deleteRoadmap as delete, get, getAll, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['roadmap'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a roadmap',
				action: 'Create a roadmap',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a roadmap',
				action: 'Delete a roadmap',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a roadmap',
				action: 'Get a roadmap',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many roadmaps',
				action: 'Get many roadmaps',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a roadmap',
				action: 'Update a roadmap',
			},
		],
		default: 'getAll',
	},
	...create.description,
	...deleteRoadmap.description,
	...get.description,
	...getAll.description,
	...update.description,
];
