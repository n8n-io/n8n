
import * as get from './get';
import * as getAll from './getAll';
import * as create from './create';
import * as del from './del';
import * as mute from './mute';

import { INodeProperties } from 'n8n-workflow';

export {
	getAll,
	get,
	mute,
	del as delete,
	create,
};


export const descriptions = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'rmm',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create new RMM Alert',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete RMM Alert',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve RMM Alert',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all RMM Alerts',
			},
			{
				name: 'Mute',
				value: 'mute',
				description: 'Mute RMM Alert',
			},
		],
		default: 'getAll',
		description: '',
	},
	...getAll.description,
	...get.description,
	...create.description,
	...del.description,
	...mute.description,
] as INodeProperties[];
