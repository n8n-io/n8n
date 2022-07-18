import {
	UserProperties,
} from '../../Interfaces';

export const userInviteDescription: UserProperties = [
	{
		displayName: 'Team Name or ID',
		name: 'teamId',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
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
		description: 'User\'s email. Multiple emails can be set separated by comma.',
	},
];
