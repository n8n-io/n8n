import {
	UserProperties,
} from '../../Interfaces';

export const userInviteDescription: UserProperties = [
	{
		displayName: 'Team ID',
		name: 'teamId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'invite',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Emails',
		name: 'emails',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'invite',
				],
			},
		},
		default: '',
		description: `User's email. Multiple emails can be set separated by comma.`,
	},
];
