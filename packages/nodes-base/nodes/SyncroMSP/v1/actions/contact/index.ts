
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
		description: '',
	},
	...getAll.description,
	...create.description,
	...get.description,
	...update.description,
	...del.description,
] as INodeProperties[];
