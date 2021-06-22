import {
	INodeProperties,
} from 'n8n-workflow';

import { channelCreateDescription } from './create';
import { channelDeleteDescription } from './delete';
import { channelMembersDescription } from './members';
import { channelRestoreDescription } from './restore';
import { channelAddUserDescription } from './addUser';
import { channelStatisticsDescription } from './statistics';

const channelDescription: INodeProperties[] = [
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
				name: 'Statistics',
				value: 'statistics',
				description: 'Get statistics for a channel',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
	...channelCreateDescription,
	...channelDeleteDescription,
	...channelMembersDescription,
	...channelRestoreDescription,
	...channelAddUserDescription,
	...channelStatisticsDescription,
];

export { channelDescription };