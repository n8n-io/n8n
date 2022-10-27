import { INodeProperties } from 'n8n-workflow';
import * as create from './create.operation';
import * as del from './delete.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as getChildren from './getChildren.operation';
import * as update from './update.operation';

export { create, del as delete, get, getAll, getChildren, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['folder'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: "Create a new mail folder in the root folder of the user's mailbox",
				action: 'Create a folder',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a folder',
				action: 'Delete a folder',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a single folder details',
				action: 'Get a folder',
			},
			{
				name: 'Get Children',
				value: 'getChildren',
				description: 'Lists all child folders under the folder',
				action: 'Get items in a folder',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many folders under the root folder of the signed-in user',
				action: 'Get many folders',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a folder',
				action: 'Update a folder',
			},
		],
		default: 'create',
	},

	...create.description,
	...del.description,
	...get.description,
	...getAll.description,
	...getChildren.description,
	...update.description,
];
