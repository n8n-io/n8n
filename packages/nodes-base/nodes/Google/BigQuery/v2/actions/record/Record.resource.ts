import type { INodeProperties } from 'n8n-workflow';
import { datasetRLC, projectRLC, tableRLC } from '../commonDescriptions/RLC.description';
import * as create from './create.operation';
import * as getAll from './getAll.operation';

export { create, getAll };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['record'],
			},
		},
		options: [
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
				resource: ['record'],
			},
		},
	},
	{
		...datasetRLC,
		displayOptions: {
			show: {
				resource: ['record'],
			},
		},
	},
	{
		...tableRLC,
		displayOptions: {
			show: {
				resource: ['record'],
			},
		},
	},
	...create.description,
	...getAll.description,
];
