import type { INodeProperties } from 'n8n-workflow';

import * as executeQuery from './executeQuery.operation';
import * as insert from './insert.operation';
import { datasetRLC, projectRLC, tableRLC } from '../commonDescriptions/RLC.description';

export { executeQuery, insert };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['database'],
			},
		},
		options: [
			{
				name: 'Execute Query',
				value: 'executeQuery',
				description: 'Execute a SQL query',
				action: 'Execute a SQL query',
			},
			{
				name: 'Insert',
				value: 'insert',
				description: 'Insert rows in a table',
				action: 'Insert rows in a table',
			},
		],
		default: 'executeQuery',
	},
	{
		...projectRLC,
		displayOptions: {
			show: {
				resource: ['database'],
				operation: ['executeQuery', 'insert'],
			},
		},
	},
	{
		...datasetRLC,
		displayOptions: {
			show: {
				resource: ['database'],
				operation: ['insert'],
			},
		},
	},
	{
		...tableRLC,
		displayOptions: {
			show: {
				resource: ['database'],
				operation: ['insert'],
			},
		},
	},
	...executeQuery.description,
	...insert.description,
];
