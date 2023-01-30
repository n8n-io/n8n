import type { INodeProperties } from 'n8n-workflow';
import { projectRLC } from '../commonDescriptions/RLC.description';
import * as executeQuery from './execute.operation';

export { executeQuery };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['query'],
			},
		},
		options: [
			{
				name: 'Execute',
				value: 'executeQuery',
				description: 'Execute a SQL query',
				action: 'Execute a SQL query',
			},
		],
		default: 'executeQuery',
	},
	{
		...projectRLC,
		displayOptions: {
			show: {
				operation: ['executeQuery'],
				resource: ['query'],
			},
		},
	},
	...executeQuery.description,
];
