
import * as getAll from './getAll';
import * as add from './add';
import * as del from './del';
import * as update from './update';
import * as get from './get';

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
					'customer',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'add',
				description: 'Add new customer',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete customer',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve customer',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all customers',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update customer',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
	...getAll.description,
	...get.description,
	...add.description,
	...del.description,
	...update.description,
] as INodeProperties[];

