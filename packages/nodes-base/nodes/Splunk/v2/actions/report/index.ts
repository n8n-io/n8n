import type { INodeProperties } from 'n8n-workflow';

import * as deleteReport from './deleteReport.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';

export { deleteReport, get, getAll };

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
				name: 'Delete',
				value: 'deleteReport',
				description: 'Delete a search configuration',
				action: 'Delete a search configuration',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a search configuration',
				action: 'Get a search configuration',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many search configurations',
				action: 'Get many search configurations',
			},
		],
		default: 'getAll',
	},

	...deleteReport.description,
	...get.description,
	...getAll.description,
];
