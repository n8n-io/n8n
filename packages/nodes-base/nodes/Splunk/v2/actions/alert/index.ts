import type { INodeProperties } from 'n8n-workflow';

import * as getMetrics from './getMetrics.operation';
import * as getReport from './getReport.operation';

export { getReport, getMetrics };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['alert'],
			},
		},
		options: [
			{
				name: 'Get Fired Alerts',
				value: 'getReport',
				description: 'Retrieve a fired alerts report',
				action: 'Get a fired alerts report',
			},
			{
				name: 'Get Metrics',
				value: 'getMetrics',
				description: 'Retrieve metrics',
				action: 'Get metrics',
			},
		],
		default: 'getReport',
	},

	...getReport.description,
	...getMetrics.description,
];
