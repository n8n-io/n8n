import type { INodeProperties } from 'n8n-workflow';

import * as count from './count.operation';
import * as create from './create.operation';
import * as executeResponder from './executeResponder.operation';
import * as get from './get.operation';
import * as getMany from './getMany.operation';
import * as getTimeline from './getTimeline.operation';
import * as update from './update.operation';

export { count, create, executeResponder, get, getMany, getTimeline, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		default: 'getMany',
		type: 'options',
		noDataExpression: true,
		required: true,
		options: [
			{
				name: 'Count',
				value: 'count',
				action: 'Count a case',
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a case',
			},
			{
				name: 'Execute Responder',
				value: 'executeResponder',
				action: 'Execute a responder on the specified case',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a single case',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many cases',
			},
			{
				name: 'Get Timeline',
				value: 'getTimeline',
				action: 'Get the timeline of a case',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a case',
			},
		],
		displayOptions: {
			show: {
				resource: ['case'],
			},
		},
	},
	...count.description,
	...create.description,
	...executeResponder.description,
	...get.description,
	...getMany.description,
	...getTimeline.description,
	...update.description,
];
