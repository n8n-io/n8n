import {
	INodeProperties,
} from 'n8n-workflow';

export const boardMemberOperations: INodeProperties[] = [
	// ----------------------------------
	//         boardMember
	// ----------------------------------
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'boardMember',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add member to board using member ID',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all members of a board',
			},
			{
				name: 'Invite',
				value: 'invite',
				description: 'Invite a new member to a board via email',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove member from board using member ID',
			},
		],
		default: 'add',
		description: 'The operation to perform.',
	},
];

export const boardMemberFields: INodeProperties[] = [
	// ----------------------------------
	//      boardMember:getAll
	// ----------------------------------
	{
		displayName: 'Board ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'boardMember',
				],
			},
		},
		description: 'The ID of the board to get members from',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'boardMember',
				],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		description: 'Max number of results to return',
		default: 20,
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'boardMember',
				],
				returnAll: [
					false,
				],
			},
		},
	},

	// ----------------------------------
	//         boardMember:add
	// ----------------------------------
	{
		displayName: 'Board ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'add',
				],
				resource: [
					'boardMember',
				],
			},
		},
		description: 'The ID of the board to add member to',
	},
	{
		displayName: 'Member ID',
		name: 'idMember',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'add',
				],
				resource: [
					'boardMember',
				],
			},
		},
		description: 'The ID of the member to add to the board',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		default: 'normal',
		displayOptions: {
			show: {
				operation: [
					'add',
				],
				resource: [
					'boardMember',
			],
			},
		},
		options: [
			{
				name: 'Normal',
				value: 'normal',
				description: 'Invite as normal member',
			},
			{
				name: 'Admin',
				value: 'admin',
				description: 'Invite as admin',
			},
			{
				name: 'Observer',
				value: 'observer',
				description: 'Invite as observer (Trello premium feature)',
			},
		],
		description: 'Determines the type of membership the user being added should have',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'add',
				],
				resource: [
					'boardMember',
			],
			},
		},
		options: [
			{
				displayName: 'Allow Billable Guest',
				name: 'allowBillableGuest',
				type: 'boolean',
				default: false,
				description: 'Allows organization admins to add multi-board guests onto a board',
			},
		],
	},

	// ----------------------------------
	//        boardMember:invite
	// ----------------------------------
	{
		displayName: 'Board ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'invite',
				],
				resource: [
					'boardMember',
				],
			},
		},
		description: 'The ID of the board to invite member to',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'invite',
				],
				resource: [
					'boardMember',
				],
			},
		},
		description: 'The ID of the board to update',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'invite',
				],
				resource: [
					'boardMember',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				default: 'normal',
				options: [
					{
						name: 'Normal',
						value: 'normal',
						description: 'Invite as normal member',
					},
					{
						name: 'Admin',
						value: 'admin',
						description: 'Invite as admin',
					},
					{
						name: 'Observer',
						value: 'observer',
						description: 'Invite as observer (Trello premium feature)',
					},
				],
				description: 'Determines the type of membership the user being added should have',
			},
			{
				displayName: 'Full Name',
				name: 'fullName',
				type: 'string',
				default: '',
				description: 'The full name of the user to add as a member of the board. Must have a length of at least 1 and cannot begin nor end with a space.',
			},
		],
	},

	// ----------------------------------
	//      boardMember:remove
	// ----------------------------------
	{
		displayName: 'Board ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'remove',
				],
				resource: [
					'boardMember',
				],
			},
		},
		description: 'The ID of the board to remove member from',
	},
	{
		displayName: 'Member ID',
		name: 'idMember',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'remove',
				],
				resource: [
					'boardMember',
				],
			},
		},
		description: 'The ID of the member to remove from the board',
	},
];
