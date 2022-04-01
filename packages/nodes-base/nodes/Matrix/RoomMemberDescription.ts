import {
	INodeProperties,
} from 'n8n-workflow';

export const roomMemberOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'roomMember',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all members',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
];


export const roomMemberFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                             roomMember:getAll                             */
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
					'roomMember',
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
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		displayOptions: {
			show: {
				resource: [
					'roomMember',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: {},
		description: 'Filtering options',
		placeholder: 'Add filter',
		options: [
			{
				displayName: 'Exclude membership',
				name: 'notMembership',
				type: 'options',
				default: '',
				description: 'Excludes members whose membership is other than selected (uses OR filter with membership)',
				options: [
					{
						name: 'Any',
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
				displayName: 'Membership',
				name: 'membership',
				type: 'options',
				default: '',
				description: 'Only fetch users with selected membership status (uses OR filter with exclude membership)',
				options: [
					{
						name: 'Any',
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


];
