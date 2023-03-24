import type { INodeProperties } from 'n8n-workflow';
import { datasetRLC, projectRLC, tableRLC } from '../commonDescriptions/RLC.description';
import * as create from './create.operation';
import * as getAll from './getAll.operation';
import * as executeQuery from './executeQuery.operation';

export { executeQuery, create, getAll };

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
				name: 'Execute',
				value: 'executeQuery',
				description: 'Execute a SQL query',
				action: 'Execute a SQL query',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new record',
				action: 'Create a record',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve records from table',
				action: 'Get many records',
			},
		],
		default: 'create',
	},
	{
		...projectRLC,
		displayOptions: {
			show: {
				resource: ['database'],
				operation: ['executeQuery', 'create', 'getAll'],
			},
		},
	},
	{
		...datasetRLC,
		displayOptions: {
			show: {
				resource: ['database'],
				operation: ['create', 'getAll'],
			},
		},
	},
	{
		...tableRLC,
		displayOptions: {
			show: {
				resource: ['database'],
				operation: ['create', 'getAll'],
			},
		},
	},
	...executeQuery.description,
	...create.description,
	...getAll.description,
];
