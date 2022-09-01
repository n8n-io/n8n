import * as create from './create';
import * as del from './del';
import * as getAll from './getAll';

import { INodeProperties } from 'n8n-workflow';

export { create, del as delete, getAll };

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['reaction'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Add a reaction to a post',
				action: 'Create a reaction',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Remove a reaction from a post',
				action: 'Delete a reaction',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all the reactions to one or more posts',
				action: 'Get all reactions',
			},
		],
		default: 'create',
	},
	...create.description,
	...del.description,
	...getAll.description,
];
