import { UserProperties } from '../../Interfaces';

export const userGetByEmailDescription: UserProperties = [
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getByEmail'],
			},
		},
		default: '',
		description: "User's email",
	},
];
