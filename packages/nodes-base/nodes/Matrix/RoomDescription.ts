import {
	INodeProperties,
} from 'n8n-workflow';

export const roomOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'room',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'New chat room with defined settings',
			},
			{
				name: 'Invite',
				value: 'invite',
				description: 'Invite a user to a room',
			},
			{
				name: 'Join',
				value: 'join',
				description: 'Join a new room',
			},
			{
				name: 'Kick',
				value: 'kick',
				description: 'Kick a user from a room',
			},
			{
				name: 'Leave',
				value: 'leave',
				description: 'Leave a room',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];


export const roomFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                room:create                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Room Name',
		name: 'roomName',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'room',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		placeholder: 'My new room',
		description: 'The operation to perform.',
		required: true,
	},
	{
		displayName: 'Preset',
		name: 'preset',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'room',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				name: 'Private Chat',
				value: 'private_chat',
				description: 'Private chat',
			},
			{
				name: 'Public Chat',
				value: 'public_chat',
				description: 'Open and public chat',
			},
		],
		default: 'public_chat',
		placeholder: 'My new room',
		description: 'The operation to perform.',
		required: true,
	},
	{
		displayName: 'Room Alias',
		name: 'roomAlias',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'room',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		placeholder: 'coolest-room-around',
		description: 'The operation to perform.',
	},
	/* -------------------------------------------------------------------------- */
	/*                                  room:join                                 */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Room ID or Alias',
		name: 'roomIdOrAlias',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'room',
				],
				operation: [
					'join',
				],
			},
		},
		default: '',
		description: 'Room ID or alias',
		required: true,
	},

	/* -------------------------------------------------------------------------- */
	/*                                  room:leave                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Room ID',
		name: 'roomId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
		},
		displayOptions: {
			show: {
				resource: [
					'room',
				],
				operation: [
					'leave',
				],
			},
		},
		default: '',
		description: 'Room ID',
		required: true,
	},

	/* -------------------------------------------------------------------------- */
	/*                                 room:invite                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Room ID',
		name: 'roomId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
		},
		displayOptions: {
			show: {
				resource: [
					'room',
				],
				operation: [
					'invite',
				],
			},
		},
		default: '',
		description: 'Room ID',
		required: true,
	},

	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'room',
				],
				operation: [
					'invite',
				],
			},
		},
		default: '',
		description: 'The fully qualified user ID of the invitee.',
		placeholder: '@cheeky_monkey:matrix.org',
		required: true,
	},


	/* -------------------------------------------------------------------------- */
	/*                                  room:kick                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Room ID',
		name: 'roomId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
		},
		displayOptions: {
			show: {
				resource: [
					'room',
				],
				operation: [
					'kick',
				],
			},
		},
		default: '',
		description: 'Room ID',
		required: true,
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'room',
				],
				operation: [
					'kick',
				],
			},
		},
		default: '',
		description: 'The fully qualified user ID.',
		placeholder: '@cheeky_monkey:matrix.org',
		required: true,
	},
	{
		displayName: 'Reason',
		name: 'reason',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'room',
				],
				operation: [
					'kick',
				],
			},
		},
		default: '',
		description: 'Reason for kick',
		placeholder: 'Telling unfunny jokes',
	},
];
