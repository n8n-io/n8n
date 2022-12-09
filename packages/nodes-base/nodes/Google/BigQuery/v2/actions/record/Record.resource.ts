import { INodeProperties } from 'n8n-workflow';
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
				description: 'Retrieve many records',
				action: 'Get many records',
			},
		],
		default: 'create',
	},
	...create.description,
	...getAll.description,
];
