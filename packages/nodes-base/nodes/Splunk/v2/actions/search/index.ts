import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteJob from './deleteJob.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as getResult from './getResult.operation';

export { create, deleteJob, get, getAll, getResult };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['search'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a search job',
				action: 'Create a search job',
			},
			{
				name: 'Delete',
				value: 'deleteJob',
				description: 'Delete a search job',
				action: 'Delete a search job',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a search job',
				action: 'Get a search job',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many search jobs',
				action: 'Get many search jobs',
			},
			{
				name: 'Get Result',
				value: 'getResult',
				description: 'Get the result of a search job',
				action: 'Get the result of a search job',
			},
		],
		default: 'create',
	},

	...create.description,
	...deleteJob.description,
	...get.description,
	...getAll.description,
	...getResult.description,
];
