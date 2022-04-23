import {
	INodeProperties,
} from 'n8n-workflow';

export const boardOperations: INodeProperties[] = [
	// ----------------------------------
	//         board
	// ----------------------------------
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'board',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new board',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a board',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get the data of a board',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a board',
			},
			{
				name: 'Get board members',
				value: 'getMembers',
				description: 'Get all members of a board',
			},
			{
				name: 'Add member to board',
				value: 'addMember',
				description: 'Add member to board using member ID',
			},
			{
				name: 'Remove member from board',
				value: 'removeMember',
				description: 'Remove member from board using member ID',
			},
			{
				name: 'Invite member via email',
				value: 'inviteMemberViaEmail',
				description: 'Invite a new member to a board via email',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const boardFields: INodeProperties[] = [

	// ----------------------------------
	//         board:create
	// ----------------------------------
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		placeholder: 'My board',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'board',
				],
			},
		},
		description: 'The name of the board',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'board',
				],
			},
		},
		description: 'The description of the board',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'board',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Aging',
				name: 'prefs_cardAging',
				type: 'options',
				options: [
					{
						name: 'Pirate',
						value: 'pirate',
					},
					{
						name: 'Regular',
						value: 'regular',
					},
				],
				default: 'regular',
				description: 'Determines the type of card aging that should take place on the board if card aging is enabled.',
			},
			{
				displayName: 'Background',
				name: 'prefs_background',
				type: 'string',
				default: 'blue',
				description: 'The id of a custom background or one of: blue, orange, green, red, purple, pink, lime, sky, grey.',
			},
			{
				displayName: 'Comments',
				name: 'prefs_comments',
				type: 'options',
				options: [
					{
						name: 'Disabled',
						value: 'disabled',
					},
					{
						name: 'Members',
						value: 'members',
					},
					{
						name: 'Observers',
						value: 'observers',
					},
					{
						name: 'Organization',
						value: 'org',
					},
					{
						name: 'Public',
						value: 'public',
					},
				],
				default: 'members',
				description: 'Who can comment on cards on this board.',
			},
			{
				displayName: 'Covers',
				name: 'prefs_cardCovers',
				type: 'boolean',
				default: true,
				description: 'Determines whether card covers are enabled.',
			},
			{
				displayName: 'Invitations',
				name: 'prefs_invitations',
				type: 'options',
				options: [
					{
						name: 'Admins',
						value: 'admins',
					},
					{
						name: 'Members',
						value: 'members',
					},
				],
				default: 'members',
				description: 'Determines what types of members can invite users to join.',
			},
			{
				displayName: 'Keep From Source',
				name: 'keepFromSource',
				type: 'string',
				default: 'none',
				description: 'To keep cards from the original board pass in the value cards.',
			},
			{
				displayName: 'Labels',
				name: 'defaultLabels',
				type: 'boolean',
				default: true,
				description: 'Determines whether to use the default set of labels.',
			},
			{
				displayName: 'Lists',
				name: 'defaultLists',
				type: 'boolean',
				default: true,
				description: 'Determines whether to add the default set of lists to a board(To Do, Doing, Done).It is ignored if idBoardSource is provided.',
			},
			{
				displayName: 'Organization ID',
				name: 'idOrganization',
				type: 'string',
				default: '',
				description: 'The id or name of the team the board should belong to.',
			},
			{
				displayName: 'Permission Level',
				name: 'prefs_permissionLevel',
				type: 'options',
				options: [
					{
						name: 'Organization',
						value: 'org',
					},
					{
						name: 'Private',
						value: 'private',
					},
					{
						name: 'Public',
						value: 'public',
					},
				],
				default: 'private',
				description: 'The permissions level of the board.',
			},
			{
				displayName: 'Power Ups',
				name: 'powerUps',
				type: 'options',
				options: [
					{
						name: 'All',
						value: 'all',
					},
					{
						name: 'Calendar',
						value: 'calendar',
					},
					{
						name: 'Card Aging',
						value: 'cardAging',
					},
					{
						name: 'Recap',
						value: 'recap',
					},
					{
						name: 'Voting',
						value: 'voting',
					},
				],
				default: 'all',
				description: 'The Power-Ups that should be enabled on the new board.',
			},
			{
				displayName: 'Self Join',
				name: 'prefs_selfJoin',
				type: 'boolean',
				default: true,
				description: 'Determines whether users can join the boards themselves or whether they have to be invited.',
			},
			{
				displayName: 'Source IDs',
				name: 'idBoardSource',
				type: 'string',
				default: '',
				description: 'The id of a board to copy into the new board.',
			},
			{
				displayName: 'Voting',
				name: 'prefs_voting',
				type: 'options',
				options: [
					{
						name: 'Disabled',
						value: 'disabled',
					},
					{
						name: 'Members',
						value: 'members',
					},
					{
						name: 'Observers',
						value: 'observers',
					},
					{
						name: 'Organization',
						value: 'org',
					},
					{
						name: 'Public',
						value: 'public',
					},
				],
				default: 'disabled',
				description: 'Who can vote on this board.',
			},
		],
	},

	// ----------------------------------
	//         board:delete
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
					'delete',
				],
				resource: [
					'board',
				],
			},
		},
		description: 'The ID of the board to delete.',
	},

	// ----------------------------------
	//         board:get
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
					'get',
				],
				resource: [
					'board',
				],
			},
		},
		description: 'The ID of the board to get.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'board',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: 'all',
				description: 'Fields to return. Either "all" or a comma-separated list: closed, dateLastActivity, dateLastView, desc, descData, idOrganization, invitations, invited, labelNames, memberships, name, pinned, powerUps, prefs, shortLink, shortUrl, starred, subscribed, url.',
			},
			{
				displayName: 'Plugin Data',
				name: 'pluginData',
				type: 'boolean',
				default: false,
				description: 'Whether to include pluginData on the card with the response.',
			},
		],
	},

	// ----------------------------------
	//         board:update
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
					'update',
				],
				resource: [
					'board',
				],
			},
		},
		description: 'The ID of the board to update.',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'board',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Closed',
				name: 'closed',
				type: 'boolean',
				default: false,
				description: 'Whether the board is closed.',
			},
			{
				displayName: 'Description',
				name: 'desc',
				type: 'string',
				default: '',
				description: 'New description of the board',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'New name of the board',
			},
			{
				displayName: 'Organization ID',
				name: 'idOrganization',
				type: 'string',
				default: '',
				description: 'The id of the team the board should be moved to.',
			},
			{
				displayName: 'Subscribed',
				name: 'subscribed',
				type: 'boolean',
				default: false,
				description: 'Whether the acting user is subscribed to the board.',
			},
		],
	},
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
					'getMembers'
				],
				resource: [
					'board'
				],
			},
		},
		description: 'The ID of the board to get members from.',
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
					'addMember'
				],
				resource: [
					'board'
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
					'addMember'
				],
				resource: ['board'],
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
					'addMember'
				],
				resource: [
					'board'
			],
			},
		},
		options: [
			{ name: 'Normal', value: 'normal', description: 'Invite as normal member' },
			{ name: 'Admin', value: 'admin', description: 'Invite as admin' },
			{ name: 'Observer', value: 'observer', description: 'Invite as observer' },
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
					'addMember'
				],
				resource: [
					'board'
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
					'removeMember'
				],
				resource: [
					'board'
				],
			},
		},
		description: 'The ID of the board to get members from.',
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
					'removeMember'
				],
				resource: [
					'board'
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
					'inviteMemberViaEmail'
				],
				resource: [
					'board'
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
					'inviteMemberViaEmail'
				],
				resource: [
					'board'
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
					'inviteMemberViaEmail'
				],
				resource: [
					'board'
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
					{ name: 'Normal', value: 'normal', description: 'Invite as normal member' },
					{ name: 'Admin', value: 'admin', description: 'Invite as admin' },
					{ name: 'Observer', value: 'observer', description: 'Invite as observer' },
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
