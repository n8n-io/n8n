import {
	INodeProperties,
} from 'n8n-workflow';

export const profileOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'profile',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
			},
		],
		default: 'get',
		description: 'Operation to perform',
	},
];


export const profileFields: INodeProperties[] = [
	{
		displayName: 'Details',
		name: 'details',
		type: 'options',
		required: true,
		default: 'identity',
		description: 'Details of my account to retrieve.',
		options: [
			{
				name: 'Identity',
				value: 'identity',
				description: 'Return the identity of the logged-in user',
			},
			{
				name: 'Blocked Users',
				value: 'blockedUsers',
				description: 'Return the blocked users of the logged-in user',
			},
			{
				name: 'Friends',
				value: 'friends',
				description: 'Return the friends of the logged-in user',
			},
			{
				name: 'Karma',
				value: 'karma',
				description: 'Return the subreddit karma for the logged-in user',
			},
			{
				name: 'Preferences',
				value: 'prefs',
				description: 'Return the settings preferences of the logged-in user',
			},
			{
				name: 'Trophies',
				value: 'trophies',
				description: 'Return the trophies of the logged-in user',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'profile',
				],
				operation: [
					'get',
				],
			},
		},
	},
];
