import * as addUser from './addUsers';
import * as create from './create';
import * as custom from './custom';
import * as get from './get';
import * as getAll from './getAll';
import * as removeUser from './removeUser';

import { INodeProperties } from 'n8n-workflow';

export {
	addUser,
	custom,
	create,
	get,
	getAll,
	removeUser,
};

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'userList',
				],
			},
		},
		options: [
			{
				name: 'Add User',
				value: 'addUser',
				description: 'Add a user to the user list',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a user list',
			},
			{
				name: 'Custom',
				value: 'custom',
				description: 'Custom query to be executed against the user list endpoint',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get the user list via its ID',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all the user lists',
			},
			{
				name: 'Remove User',
				value: 'removeUser',
				description: 'Remove a user from the user list',
			},
		],
		default: 'getAll',
		description: 'The operation to perform',
	},
	...addUser.description,
	...create.description,
	...custom.description,
	...get.description,
	...getAll.description,
	...removeUser.description,


	// TODO: make customer_id and devToken global (for all resources)
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'userList',
				],
			},
		},
		default: '',
		description: 'Your Google Ads customer ID.',
	},
	{
		displayName: 'Developer Token',
		name: 'devToken',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'userList',
				],
			},
		},
		default: '',
		description: 'Your Google Ads developer token.',
	},
];
