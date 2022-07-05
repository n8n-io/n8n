import {
	INodeProperties,
} from 'n8n-workflow';

export const cardCommentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'cardComment',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a comment on a card',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a comment from a card',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a card comment',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all card comments',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const cardCommentFields: INodeProperties[] = [
	// ----------------------------------
	//         cardComment:create
	// ----------------------------------
	{
		displayName: 'Board ID',
		name: 'boardId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBoards',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'cardComment',
				],
			},
		},
		description: 'The ID of the board that card belongs to.',
	},
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getLists',
			loadOptionsDependsOn: [
				'boardId',
			],
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'cardComment',
				],
			},
		},
		description: 'The ID of the list that card belongs to.',
	},
	{
		displayName: 'Card ID',
		name: 'cardId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCards',
			loadOptionsDependsOn: [
				'boardId',
				'listId',
			],
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'cardComment',
				],
			},
		},
		description: 'The ID of the card',
	},
	{
		displayName: 'Author ID',
		name: 'authorId',
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
					'cardComment',
				],
			},
		},
		description: 'The user who posted the comment.',
	},
	{
		displayName: 'Comment',
		name: 'comment',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'cardComment',
				],
			},
		},
		description: 'The comment text.',
	},

	// ----------------------------------
	//         cardComment:delete
	// ----------------------------------
	{
		displayName: 'Board ID',
		name: 'boardId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBoards',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'cardComment',
				],
			},
		},
		description: 'The ID of the board that card belongs to.',
	},
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getLists',
			loadOptionsDependsOn: [
				'boardId',
			],
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'cardComment',
				],
			},
		},
		description: 'The ID of the list that card belongs to.',
	},
	{
		displayName: 'Card ID',
		name: 'cardId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCards',
			loadOptionsDependsOn: [
				'boardId',
				'listId',
			],
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'cardComment',
				],
			},
		},
		description: 'The ID of the card.',
	},
	{
		displayName: 'Comment ID',
		name: 'commentId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getComments',
			loadOptionsDependsOn: [
				'boardId',
				'cardId',
			],
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'cardComment',
				],
			},
		},
		description: 'The ID of the comment to delete.',
	},

	// ----------------------------------
	//         cardComment:get
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
					'cardComment',
				],
			},
		},
		description: 'The ID of the board that card belongs to.',
	},
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getLists',
			loadOptionsDependsOn: [
				'boardId',
			],
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'cardComment',
				],
			},
		},
		description: 'The ID of the list that card belongs to.',
	},
	{
		displayName: 'Card ID',
		name: 'cardId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCards',
			loadOptionsDependsOn: [
				'boardId',
				'listId',
			],
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'cardComment',
				],
			},
		},
		description: 'The ID of the card.',
	},
	{
		displayName: 'Comment ID',
		name: 'commentId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'cardComment',
				],
			},
		},
		description: 'The ID of the comment to get.',
	},

	// ----------------------------------
	//         cardComment:getAll
	// ----------------------------------
	{
		displayName: 'Board ID',
		name: 'boardId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBoards',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'cardComment',
				],
			},
		},
		description: 'The ID of the board that card belongs to.',
	},
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getLists',
			loadOptionsDependsOn: [
				'boardId',
			],
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'cardComment',
				],
			},
		},
		description: 'The ID of the list that card belongs to.',
	},
	{
		displayName: 'Card ID',
		name: 'cardId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCards',
			loadOptionsDependsOn: [
				'boardId',
				'listId',
			],
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'cardComment',
				],
			},
		},
		description: 'The ID of the card.',
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
					'cardComment',
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
					'cardComment',
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
