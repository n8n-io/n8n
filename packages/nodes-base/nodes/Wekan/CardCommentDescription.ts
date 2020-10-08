import {
	INodeProperties,
} from 'n8n-workflow';

export const cardCommentOperations = [
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
] as INodeProperties[];

export const cardCommentFields = [
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
		description: 'The ID of the board that card belongs to.'
	},
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getLists',
		},
		default: '',
		required: true,
		displayOptions: {
			hide: {
				boardId: [
					'',
				],
			},
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
		},
		default: '',
		required: true,
		displayOptions: {
			hide: {
				boardId: [
					'',
				],
				listId: [
					'',
				],
			},
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
		description: 'The ID of the board that card belongs to.'
	},
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getLists',
		},
		default: '',
		required: true,
		displayOptions: {
			hide: {
				boardId: [
					'',
				],
			},
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
		},
		default: '',
		required: true,
		displayOptions: {
			hide: {
				boardId: [
					'',
				],
				listId: [
					'',
				],
			},
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
		},
		default: '',
		required: true,
		displayOptions: {
			hide: {
				boardId: [
					'',
				],
				cardId: [
					'',
				],
			},
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
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBoards',
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
		description: 'The ID of the board that card belongs to.'
	},
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getLists',
		},
		default: '',
		required: true,
		displayOptions: {
			hide: {
				boardId: [
					'',
				],
			},
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
		},
		default: '',
		required: true,
		displayOptions: {
			hide: {
				boardId: [
					'',
				],
				listId: [
					'',
				],
			},
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
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getComments',
		},
		default: '',
		required: true,
		displayOptions: {
			hide: {
				boardId: [
					'',
				],
				cardId: [
					'',
				],
			},
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
		description: 'The ID of the board that card belongs to.'
	},
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getLists',
		},
		default: '',
		required: true,
		displayOptions: {
			hide: {
				boardId: [
					'',
				],
			},
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
		},
		default: '',
		required: true,
		displayOptions: {
			hide: {
				boardId: [
					'',
				],
				listId: [
					'',
				],
			},
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
] as INodeProperties[];
