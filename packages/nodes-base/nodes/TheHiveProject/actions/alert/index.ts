import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as executeResponder from './executeResponder.operation';
import * as get from './get.operation';
import * as search from './search.operation';
import * as status from './status.operation';
import * as merge from './merge.operation';
import * as promote from './promote.operation';
import * as update from './update.operation';

export { create, executeResponder, get, search, status, merge, promote, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create alert',
			},
			{
				name: 'Execute Responder',
				value: 'executeResponder',
				action: 'Execute a responder on the specified alert',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an alert',
			},
			{
				name: 'Merge Into Case',
				value: 'merge',
				action: 'Merge alert into an existing case',
			},
			{
				name: 'Promote to Case',
				value: 'promote',
				action: 'Promote an alert into a case',
			},
			{
				name: 'Search',
				value: 'search',
				action: 'Search alerts',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update alert',
			},
			{
				name: 'Update Status',
				value: 'status',
				action: 'Update alert status',
			},
		],
		displayOptions: {
			show: {
				resource: ['alert'],
			},
		},
		default: 'create',
	},
	...create.description,
	...executeResponder.description,
	...get.description,
	...search.description,
	...status.description,
	...merge.description,
	...promote.description,
	...update.description,
];
