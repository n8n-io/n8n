import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteReport from './deleteReport.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';

export { create, deleteReport, get, getAll };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['report'],
			},
		},
		options: [
			{
				name: 'Create From Search',
				value: 'create',
				description: 'Create a search report from a search job',
				action: 'Create a search report',
			},
			{
				name: 'Delete',
				value: 'deleteReport',
				description: 'Delete a search report',
				action: 'Delete a search report',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a search report',
				action: 'Get a search report',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many search reports',
				action: 'Get many search reports',
			},
		],
		default: 'getAll',
	},

	...create.description,
	...deleteReport.description,
	...get.description,
	...getAll.description,
];
