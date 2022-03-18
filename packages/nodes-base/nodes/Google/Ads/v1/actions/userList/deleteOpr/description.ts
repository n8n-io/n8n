import {
	UserListProperties,
} from '../../Interfaces';

export const userListDescription: UserListProperties = [
	{
		displayName: 'User List Resource Name',
		name: 'userListResourceName',
		required: true,
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getUserListResourceNames',
		},
		displayOptions: {
			show: {
				resource: ['userList'],
				operation: ['deleteOpr'],
			},
		},
		default: '',
		description: 'The name of the user list',
	},
	{
		displayName: 'Simplify Output',
		name: 'simplifyOutput',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['userList'],
				operation: ['deleteOpr'],
			},
		},
		description: 'Whether to simplify the output data',
	},
];
