import type { UserProperties } from '../../Interfaces';

export const userGetAllDescription: UserProperties = [
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getAll'],
			},
		},
		default: true,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getAll'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'In channel',
				name: 'inChannel',
				type: 'string',
				default: '',
				description: 'The ID of the channel to get users for',
			},
			{
				displayName: 'In team',
				name: 'inTeam',
				type: 'string',
				default: '',
				description: 'The ID of the team to get users for',
			},
			{
				displayName: 'Not in team',
				name: 'notInTeam',
				type: 'string',
				default: '',
				description: 'The ID of the team to exclude users for',
			},
			{
				displayName: 'Not in channel',
				name: 'notInChannel',
				type: 'string',
				default: '',
				description: 'The ID of the channel to exclude users for',
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'options',
				options: [
					{
						name: 'Created at',
						value: 'createdAt',
					},
					{
						name: 'Last activity at',
						value: 'lastActivityAt',
					},
					{
						name: 'Status',
						value: 'status',
					},
					{
						name: 'Username',
						value: 'username',
					},
				],
				default: 'username',
				description: 'The ID of the channel to exclude users for',
			},
		],
	},
];
