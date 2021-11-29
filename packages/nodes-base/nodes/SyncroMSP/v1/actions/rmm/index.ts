
import * as getAlert from './getAlert';
import * as getAll from './getAll';
import * as addAlert from './addAlert';
import * as deleteAlert from './deleteAlert';
import * as muteAlert from './muteAlert';

import { INodeProperties } from 'n8n-workflow';

export {
	getAll,
	getAlert,
	muteAlert,
	deleteAlert,
	addAlert,
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
				value: 'addAlert',
				description: 'add new RMM Alert',
			},
			{
				name: 'Delete',
				value: 'deleteAlert',
				description: 'delete RMM Alert',
			},
			{
				name: 'Get',
				value: 'getAlert',
				description: 'Retrieve RMM Alert ',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all  RMM Alerts',
			},
			{
				name: 'Mute',
				value: 'muteAlert',
				description: 'mute RMM Alert',
			},
		],
		default: '',
		description: 'The operation to perform.',
	},
	...getAll.description,
	...getAlert.description,
	...addAlert.description,
	...deleteAlert.description,
	...muteAlert.description,
] as INodeProperties[];

