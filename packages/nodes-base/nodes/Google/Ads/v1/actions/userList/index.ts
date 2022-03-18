import * as addUser from './addUsers';
import * as create from './create';
import * as deleteOpr from './deleteOpr';
import * as get from './get';
import * as getAll from './getAll';
import * as removeUser from './removeUser';
import * as update from './update';

import { INodeProperties } from 'n8n-workflow';

export {
	addUser,
	create,
	deleteOpr,
	get,
	getAll,
	removeUser,
	update,
};

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['userList'],
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
				name: 'Delete',
				value: 'deleteOpr',
				description: 'Delete a user list',
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
			// {
			// 	name: 'Update',
			// 	value: 'update',
			// 	description: 'Update a user list',
			// },
		],
		default: 'getAll',
		description: 'The operation to perform',
	},
	...addUser.description,
	...create.description,
	...deleteOpr.description,
	...get.description,
	...getAll.description,
	...removeUser.description,
	// ...update.description,
];
