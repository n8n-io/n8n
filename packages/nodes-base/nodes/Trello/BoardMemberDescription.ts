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
					'boardMembers',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'addMember',
				description: 'Add member to board using member ID',
			},
			{
				name: 'Get All',
				value: 'getMembers',
				description: 'Get all members of a board',
			},
			{
				name: 'Invite',
				value: 'inviteMemberViaEmail',
				description: 'Invite a new member to a board via email',
			},
			{
				name: 'Remove',
				value: 'removeMember',
				description: 'Remove member from board using member ID',
			},
		],
		default: 'addMember',
		description: 'The operation to perform.',
	},
];

export const boardMemberFields: INodeProperties[] = [
	// ----------------------------------
	//         board:getMembers
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
					'getMembers',
				],
				resource: [
					'boardMembers',
				],
			},
		},
		description: 'The ID of the board to get members from.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getMembers',
				],
				resource: [
					'boardMembers',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 20,
		displayOptions: {
			show: {
				operation: [
					'getMembers',
				],
				resource: [
					'boardMembers',
				],
				returnAll: [
					false,
				],
			},
		},
	},

		// ----------------------------------
	//         board:addMember
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
					'addMember',
				],
				resource: [
					'boardMembers',
				],
			},
		},
		description: 'The ID of the board to add member to.',
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
					'addMember',
				],
				resource: [
					'boardMembers',
				],
			},
		},
		description: 'The ID of the member to add to the board.',
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
					'addMember',
				],
				resource: [
					'boardMembers',
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
		description: 'Determines the type of membership the user being added should have.',
	},
	{
		displayName: 'Allow billable guest',
		name: 'allowBillableGuest',
		type: 'boolean',
		default: false,
		required: false,
		displayOptions: {
			show: {
				operation: [
					'addMember',
				],
				resource: [
					'boardMembers',
				],
			},
		},
		description: 'Allows organization admins to add multi-board guests onto a board.',
	},

	// ----------------------------------
	//         board:removeMember
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
					'removeMember',
				],
				resource: [
					'boardMembers',
				],
			},
		},
		description: 'The ID of the board to remove member from.',
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
					'removeMember',
				],
				resource: [
					'boardMembers',
				],
			},
		},
		description: 'The ID of the member to remove from the board.',
	},

	// ----------------------------------
	//         board:inviteMemberViaEmail
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
					'inviteMemberViaEmail',
				],
				resource: [
					'boardMembers',
				],
			},
		},
		description: 'The ID of the board to invite member to.',
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
					'inviteMemberViaEmail',
				],
				resource: [
					'boardMembers',
				],
			},
		},
		description: 'The ID of the board to update.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'inviteMemberViaEmail',
				],
				resource: [
					'boardMembers',
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
				description: 'Determines the type of membership the user being added should have.',
			},
			{
				displayName: 'Full name',
				name: 'fullName',
				type: 'string',
				default: '',
				description: 'The full name of the user to add as a member of the board. Must have a length of at least 1 and cannot begin nor end with a space.',
			},
		],
	},
];
