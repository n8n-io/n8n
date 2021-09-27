import {
	UserProperties,
} from '../../Interfaces';

export const userGetByIdDescription: UserProperties = [
	{
		displayName: 'User IDs',
		name: 'userIds',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'getById',
				],
			},
		},
		default: '',
		description: `User's ID`,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'getById',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Since',
				name: 'since',
				type: 'dateTime',
				default: '',
				description: 'Only return users that have been modified since the given Unix timestamp (in milliseconds).',
			},
		],
	},
];
