import type { INodeProperties } from 'n8n-workflow';

import * as get from './get.operation';
import * as getAll from './getAll.operation';

export { get, getAll };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['workflowState'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a workflow state',
				action: 'Get a workflow state',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many workflow states',
				action: 'Get many workflow states',
			},
		],
		default: 'getAll',
	},
	...get.description,
	...getAll.description,
];
