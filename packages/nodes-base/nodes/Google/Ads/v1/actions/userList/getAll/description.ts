import {
	UserListProperties,
} from '../../Interfaces';

export const userListGetAllDescription: UserListProperties = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['userList'],
				operation: ['getAll'],
			},
		},
		description: 'Whether to retrieve all user lists',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['userList'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 100,
		description: 'Number of results to return',
	},
	{
		displayName: 'Simplify Output',
		name: 'simplifyOutput',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['userList'],
				operation: ['getAll'],
			},
		},
		description: 'Whether to simplify the output data',
	},
];
