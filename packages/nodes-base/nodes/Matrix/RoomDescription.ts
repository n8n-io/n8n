import { INodeProperties } from 'n8n-workflow';

export const roomOperations = [
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
				name: 'Create a room',
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
			{
				name: 'List members',
				value: 'listMembers',
				description: 'List current members of a room',
			},
		],
		default: 'listMembers',
		description: 'The operation to perform.',
	},
] as INodeProperties[];


export const roomFields = [
/* -------------------------------------------------------------------------- */
/*                                room create                                 */
/* -------------------------------------------------------------------------- */

    {
        displayName: 'Room name',
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
				name: 'Private chat',
				value: 'private_chat',
				description: 'Private chat',
			},
			{
				name: 'Public chat',
				value: 'public_chat',
				description: 'Open and public chat',
			},
		],
        default: 'public_chat',
        placeholder: 'My new room',
        description: 'The operation to perform.',
    },
    {
        displayName: 'Room alias',
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
/*                              room list members                             */
/* -------------------------------------------------------------------------- */

    {
        displayName: 'Room ID',
        name: 'roomId',
        type: 'string',
        displayOptions: {
            show: {
                resource: [
                    'room',
                ],
                operation: [
                    'listMembers',
                ],
            },
        },
        default: '',    
        description: 'Room ID',
        required: true,
    },    
    {
        displayName: 'Membership',
        name: 'membership',
        type: 'options',
        displayOptions: {
            show: {
                resource: [
                    'room',
                ],
                operation: [
                    'listMembers',
                ],
            },
        },
        default: '',    
        description: 'Displays users only with selected membership status (uses OR filter with exclude membership)',
        options: [
			{
				name: '',
				value: '',
				description: 'Any user membership',
			},
			{
				name: 'Ban',
				value: 'ban',
				description: 'Users removed from the room',
			},
			{
				name: 'Invite',
				value: 'invite',
				description: 'Users invited to join',
			},
			{
				name: 'Join',
				value: 'join',
				description: 'Users currently in the room',
			},
			{
				name: 'Leave',
				value: 'leave',
				description: 'Users who left',
			},
		],
    },
    {
        displayName: 'Exclude membership',
        name: 'notMembership',
        type: 'options',
        displayOptions: {
            show: {
                resource: [
                    'room',
                ],
                operation: [
                    'listMembers',
                ],
            },
        },
        default: '',    
        description: 'Displays users whose membership is other than selected (uses OR filter with membership)',
        options: [
			{
				name: '',
				value: '',
				description: 'Any user membership',
			},
			{
				name: 'Ban',
				value: 'ban',
				description: 'Users removed from the room',
			},
			{
				name: 'Invite',
				value: 'invite',
				description: 'Users invited to join',
			},
			{
				name: 'Join',
				value: 'join',
				description: 'Users currently in the room',
			},
			{
				name: 'Leave',
				value: 'leave',
				description: 'Users who left',
			},
		],
    },
/* -------------------------------------------------------------------------- */
/*                                  room join                                 */
/* -------------------------------------------------------------------------- */
    
    {
        displayName: 'Room ID or alias',
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
/*                                  room leave                                */
/* -------------------------------------------------------------------------- */
    
    {
        displayName: 'Room ID',
        name: 'roomId',
        type: 'string',
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
/*                                 room invite                                */
/* -------------------------------------------------------------------------- */
    
    {
        displayName: 'Room ID',
        name: 'roomId',
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
/*                                  room kick                                 */
/* -------------------------------------------------------------------------- */
    
    {
        displayName: 'Room ID',
        name: 'roomId',
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



] as INodeProperties[];