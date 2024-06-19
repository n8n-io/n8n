import type { INodeProperties } from 'n8n-workflow';

import * as getReport from './getReport.operation';

export { getReport };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['firedAlert'],
			},
		},
		options: [
			{
				name: 'Get Report',
				value: 'getReport',
				description: 'Retrieve a fired alerts report',
				action: 'Get a fired alerts report',
			},
		],
		default: 'getReport',
	},

	...getReport.description,
];
