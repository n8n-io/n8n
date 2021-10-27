import {
	INodeProperties,
} from 'n8n-workflow';

export const userOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
			},
		},
		options: [
			{
				name: 'Info',
				value: 'info',
				description: `Get information about a user`,
			},
			{
				name: 'Get Presence',
				value: 'getPresence',
				description: `Get online status of a user`,
			},
			{
				name: 'Invite User',
				value: 'inviteUser',
				description: `Invite user in slack`,
			},
			{
				name: 'Remove User',
				value: 'removeUser',
				description: `Remove User from workspace`,
			},
			{
				name: 'Find User By Email',
				value: 'lookupByEmail',
				description: `Find User By Email`,
			}
		],
		default: 'info',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const userFields = [

	/* -------------------------------------------------------------------------- */
	/*                                user:info                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User ID',
		name: 'user',
		type: 'string',
		typeOptions: {
			loadOptionsMethod: 'getUsers',
		},
		default: '',
		displayOptions: {
			show: {
				operation: [
					'info',
				],
				resource: [
					'user',
				],
			},
		},
		required: true,
		description: 'The ID of the user to get information about.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                user:getPresence                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User ID',
		name: 'user',
		type: 'string',
		typeOptions: {
			loadOptionsMethod: 'getUsers',
		},
		default: '',
		displayOptions: {
			show: {
				operation: [
					'getPresence',
				],
				resource: [
					'user',
				],
			},
		},
		required: true,
		description: 'The ID of the user to get the online status of.',
	},

		/* -------------------------------------------------------------------------- */
	/*                                user:inviteUser                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Channel Ids',
		name: 'channelIds',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: [
					'inviteUser',
				],
				resource: [
					'user',
				],
			},
		},
		required: true,
		description: 'Provide channel ids like: C1A2B3C4D,C26Z25Y24',
	},
	{
		displayName: 'email',
		name: 'email',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: [
					'inviteUser',
				],
				resource: [
					'user',
				],
			},
		},
		required: true,
		description: 'Provide email Id',
	},
	{
		displayName: 'Team Id',
		name: 'teamId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: [
					'inviteUser',
				],
				resource: [
					'user',
				],
			},
		},
		required: true,
		description: 'Provide Team Id',
	},

/* -------------------------------------------------------------------------- */
	/*                                user:removeUser                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User Id',
		name: 'userId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: [
					'removeUser',
				],
				resource: [
					'user',
				],
			},
		},
		required: true,
		description: 'Provide email Id',
	},
	{
		displayName: 'Team Id',
		name: 'teamId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: [
					'removeUser',
				],
				resource: [
					'user',
				],
			},
		},
		required: true,
		description: 'Provide Team Id',
	},
/* -------------------------------------------------------------------------- */
	/*                                user:lookupByEmail                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'email',
		name: 'email',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: [
					'lookupByEmail',
				],
				resource: [
					'user',
				],
			},
		},
		required: true,
		description: 'Provide email Id',
	}
] as INodeProperties[];
