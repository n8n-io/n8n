import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as executeResponder from './executeResponder.operation';
import * as get from './get.operation';
import * as getMany from './getMany.operation';

export { create, executeResponder, get, getMany };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		noDataExpression: true,
		type: 'options',
		required: true,
		default: 'getMany',
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create task log',
				action: 'Create a log',
			},
			{
				name: 'Execute Responder',
				value: 'executeResponder',
				description: 'Execute a responder on a selected log',
				action: 'Execute a responder',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Get many task logs',
				action: 'Get many logs',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a single log',
				action: 'Get a log',
			},
		],
		displayOptions: {
			show: {
				resource: ['log'],
			},
		},
	},
	...create.description,
	...executeResponder.description,
	...get.description,
	...getMany.description,
];
