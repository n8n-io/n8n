
import * as getAll from './getAll';
import * as add from './add';
import * as get from './get';
import * as update from './update';
import * as del from './del';

import { INodeProperties } from 'n8n-workflow';

export {
	getAll,
	add,
	del as delete,
	update,
	get,
};


export const descriptions = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
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
				value: 'add',
				description: 'Add new contact',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete contact',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve contact',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all contacts',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update contact',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
	...getAll.description,
	...add.description,
	...get.description,
	...update.description,
	...del.description,
] as INodeProperties[];
