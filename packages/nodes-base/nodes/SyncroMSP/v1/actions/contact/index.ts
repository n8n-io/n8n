
import * as getAll from './getAll';
import * as create from './create';
import * as get from './get';
import * as update from './update';
import * as del from './del';

import { INodeProperties } from 'n8n-workflow';

export {
	getAll,
	create,
	del as delete,
	update,
	get,
};


export const descriptions = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create new contact',
				action: 'Create a contact',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete contact',
				action: 'Delete a contact',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve contact',
				action: 'Get a contact',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all contacts',
				action: 'Get all contacts',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update contact',
				action: 'Update a contact',
			},
		],
		default: 'getAll',
	},
	...getAll.description,
	...create.description,
	...get.description,
	...update.description,
	...del.description,
] as INodeProperties[];
