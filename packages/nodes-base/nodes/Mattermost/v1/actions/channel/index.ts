import * as create from './create';
import * as del from './del';
import * as members from './members';
import * as restore from './restore';
import * as addUser from './addUser';
import * as statistics from './statistics';
import * as search from './search';
import { INodeProperties } from 'n8n-workflow';

export {
	create,
	del as delete,
	members,
	restore,
	addUser,
	statistics,
	search,
};


export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'channel',
				],
			},
		},
		options: [
			{
				name: 'Add User',
				value: 'addUser',
				description: 'Add a user to a channel',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new channel',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Soft delete a channel',
			},
			{
				name: 'Member',
				value: 'members',
				description: 'Get a page of members for a channel',
			},
			{
				name: 'Restore',
				value: 'restore',
				description: 'Restores a soft deleted channel',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search for a channel',
			},
			{
				name: 'Statistics',
				value: 'statistics',
				description: 'Get statistics for a channel',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
	...create.description,
	...del.description,
	...members.description,
	...restore.description,
	...addUser.description,
	...statistics.description,
	...search.description,
];
