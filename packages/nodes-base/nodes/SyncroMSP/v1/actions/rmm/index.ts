import * as get from './get';
import * as getAll from './getAll';
import * as create from './create';
import * as del from './del';
import * as mute from './mute';

import { INodeProperties } from 'n8n-workflow';

export { getAll, get, mute, del as delete, create };

export const descriptions = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['rmm'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create new RMM Alert',
				action: 'Create an RMM alert',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete RMM Alert',
				action: 'Delete an RMM alert',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve RMM Alert',
				action: 'Get an RMM alert',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all RMM Alerts',
				action: 'Get all RMM alerts',
			},
			{
				name: 'Mute',
				value: 'mute',
				description: 'Mute RMM Alert',
				action: 'Mute an RMM alert',
			},
		],
		default: 'getAll',
	},
	...getAll.description,
	...get.description,
	...create.description,
	...del.description,
	...mute.description,
] as INodeProperties[];
