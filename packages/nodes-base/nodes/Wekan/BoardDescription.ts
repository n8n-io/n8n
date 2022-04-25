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
				name: 'Get All',
				value: 'getAll',
				description: 'Get all user boards',
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
		displayName: 'Title',
		name: 'title',
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
		description: 'The title of the board.',
	},
	{
		displayName: 'Owner',
		name: 'owner',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getUsers',
		},
		default: '',
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
		description: 'The user ID in Wekan.',
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
				displayName: 'Active',
				name: 'isActive',
				type: 'boolean',
				default: false,
				description: 'Set the board active.',
			},
			{
				displayName: 'Admin',
				name: 'isAdmin',
				type: 'boolean',
				default: false,
				description: 'Set the owner an admin of the board.',
			},
			{
				displayName: 'Color',
				name: 'color',
				type: 'options',
				options: [
					{
						name: 'Belize',
						value: 'belize',
					},
					{
						name: 'Nephritis',
						value: 'nephritis',
					},
					{
						name: 'Pomegranate',
						value: 'pomegranate',
					},
					{
						name: 'Pumpkin',
						value: 'pumpkin',
					},
					{
						name: 'Wisteria',
						value: 'wisteria',
					},
					{
						name: 'Midnight',
						value: 'midnight',
					},
				],
				default: '',
				description: 'The color of the board.',
			},
			{
				displayName: 'Comment only',
				name: 'isCommentOnly',
				type: 'boolean',
				default: false,
				description: 'Only enable comments.',
			},
			{
				displayName: 'No comments',
				name: 'isNoComments',
				type: 'boolean',
				default: false,
				description: 'Disable comments.',
			},
			{
				displayName: 'Permission',
				name: 'permission',
				type: 'options',
				options: [
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
				description: 'Set the board permission.',
			},
			{
				displayName: 'Worker',
				name: 'isWorker',
				type: 'boolean',
				default: false,
				description: 'Only move cards, assign himself to card and comment.',
			},
		],
	},

	// ----------------------------------
	//         board:delete
	// ----------------------------------
	{
		displayName: 'Board ID',
		name: 'boardId',
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
		name: 'boardId',
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

	// ----------------------------------
	//         board:getAll
	// ----------------------------------
	{
		displayName: 'User ID',
		name: 'IdUser',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getUsers',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'board',
				],
			},
		},
		description: 'The ID of the user that boards are attached.',
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
					'board',
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
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'board',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 200,
		},
		default: 100,
		description: 'How many results to return.',
	},

];
