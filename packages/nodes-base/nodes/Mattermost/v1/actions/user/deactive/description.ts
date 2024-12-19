import type { UserProperties } from '../../Interfaces';

export const userDeactivateDescription: UserProperties = [
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['deactivate'],
			},
		},
		default: '',
		description: 'User GUID',
	},
];
