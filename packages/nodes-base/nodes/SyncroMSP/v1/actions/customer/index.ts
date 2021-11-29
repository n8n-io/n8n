
import * as getAll from './getAll';
import * as addCustomer from './addCustomer';
import * as deleteCustomer from './deleteCustomer';
import * as updateCustomer from './updateCustomer';
import * as getCustomer from './getCustomer';

import { INodeProperties } from 'n8n-workflow';

export {
	getAll,
	addCustomer,
	deleteCustomer,
	updateCustomer,
	getCustomer,
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
				value: 'addCustomer',
				description: 'add new customers',
			},
			{
				name: 'Delete',
				value: 'deleteCustomer',
				description: 'delete customers',
			},
			{
				name: 'Get',
				value: 'getCustomer',
				description: 'Retrieve customer',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all customers',
			},
			{
				name: 'Update',
				value: 'updateCustomer',
				description: 'update customers',
			},
		],
		default: '',
		description: 'The operation to perform.',
	},
	...getAll.description,
	...getCustomer.description,
	...addCustomer.description,
	...deleteCustomer.description,
	...updateCustomer.description,
] as INodeProperties[];

