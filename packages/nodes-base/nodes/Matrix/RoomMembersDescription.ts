import { INodeProperties } from 'n8n-workflow';

export const roomMembersOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'roomMembers',
				],
			},
		},
		options: [
			{
				name: 'Get all members',
				value: 'getAll',
				description: 'New chat room with defined settings',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];


export const roomMembersFields = [
/* -------------------------------------------------------------------------- */
/*                             roomMembers:getAll                             */
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
                    'roomMembers',
                ],
                operation: [
                    'getAll',
                ],
            },
        },
        default: '',    
        description: 'Room ID',
        required: true,
    },
    {
		displayName: 'Filter Options',
		name: 'filterOptions',
		type: 'collection',
		displayOptions: {
            show: {
                resource: [
                    'roomMembers',
                ],
                operation: [
                    'getAll',
                ],
            },
        },
		default: {},
		description: 'Filtering options',
		placeholder: 'Add filters',
		options: [
            
            {
                displayName: 'Membership',
                name: 'membership',
                type: 'options',
                default: '',    
                description: 'Only fetch users with selected membership status (uses OR filter with exclude membership)',
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
                default: '',    
                description: 'Excludes members whose membership is other than selected (uses OR filter with membership)',
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
            
            
            
		],
	},


] as INodeProperties[];