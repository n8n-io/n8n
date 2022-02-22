import {
	UserListProperties,
} from '../../Interfaces';

export const userListDescription: UserListProperties = [
	{
		displayName: 'User List ID',
		name: 'userListId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['userList'],
				operation: ['get'],
			},
		},
		description: 'The ID of the user list',
	},
];
