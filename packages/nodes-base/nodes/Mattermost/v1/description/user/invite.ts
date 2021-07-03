import {
	INodeProperties,
} from 'n8n-workflow';

const userInviteDescription: INodeProperties[] = [
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
		description: `User's email. Multiple can be set separated by comma.`,
	},

];

export { userInviteDescription };