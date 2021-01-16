import {
	INodeProperties,
} from 'n8n-workflow';

export const myAccountOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'myAccount',
				],
			},
		},
		options: [
			{
				name: 'Get identity',
				value: 'getIdentity',
				description: 'Return the identity of the logged-in user',
			},
			{
				name: 'Get blocked users',
				value: 'getBlockedUsers',
				description: 'Return the identity of the logged-in user',
			},
			{
				name: 'Get friends',
				value: 'getFriends',
				description: 'Return a list of friends for the logged-in user',
			},
			{
				name: 'Get karma',
				value: 'getKarma',
				description: 'Return a breakdown of subreddit karma',
			},
			{
				name: 'Get preferences',
				value: 'getPrefs',
				description: 'Return the preference settings of the logged-in user',
			},
			{
				name: 'Get trophies',
				value: 'getTrophies',
				description: 'Return a list of trophies for the logged-in user',
			},
		],
		default: 'getIdentity',
		description: 'Operation to perform',
	},
] as INodeProperties[];
