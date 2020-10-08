import {
	INodeProperties,
} from 'n8n-workflow';

export const checklistOperations = [
	// ----------------------------------
	//         checklist
	// ----------------------------------
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'checklist',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new checklist',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a checklist',
			},
			{
				name: 'Delete Checklist Item',
				value: 'deleteCheckItem',
				description: 'Delete a checklist item',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get the data of a checklist',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Returns all checklists for the card',
			},
			{
				name: 'Get Checklist Items',
				value: 'getCheckItem',
				description: 'Get a specific checklist on a card',
			},
			{
				name: 'Update Checklist Item',
				value: 'updateCheckItem',
				description: 'Update an item in a checklist on a card',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},

] as INodeProperties[];

export const checklistFields = [
	// ----------------------------------
	//         checklist:create
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
					'checklist',
				],
			},
		},
		description: 'The ID of the board where the card is in.'
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
					'checklist',
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
					'checklist',
				],
			},
		},
		description: 'The ID of the card to add checklist to.',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'checklist',
				],
			},
		},
		description: 'The title of the checklist to add.',
	},
	{
		displayName: 'Items',
		name: 'items',
		placeholder: 'Add item',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'checklist',
				],
			},
		},
		default: {},
		options: [
			{
				name: 'itemValues',
				displayName: 'Item',
				values: [
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						description: 'The text of the item.',
					},
					{
						displayName: 'Finished',
						name: 'isFinished',
						type: 'boolean',
						default: false,
						description: 'Item is finished.',
					},
				],
			},
		],
	},

	// ----------------------------------
	//         checklist:delete
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
					'checklist',
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
					'checklist',
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
					'checklist',
				],
			},
		},
		description: 'The ID of the card that checklist belongs to.',
	},
	{
		displayName: 'Checklist ID',
		name: 'checklistId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChecklists',
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
					'checklist',
				],
			},
		},
		description: 'The ID of the checklist to delete.',
	},

	// ----------------------------------
	//         checklist:get
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
					'checklist',
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
					'checklist',
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
					'checklist',
				],
			},
		},
		description: 'The ID of the card that checklist belongs to.'
	},
	{
		displayName: 'Checklist ID',
		name: 'checklistId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChecklists',
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
					'checklist',
				],
			},
		},
		description: 'The ID of the checklist to get.',
	},

	// ----------------------------------
	//         checklist:getAll
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
					'checklist',
				],
			},
		},
		description: 'The ID of the board that list belongs to.'
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
					'checklist',
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
					'checklist',
				],
			},
		},
		description: 'The ID of the card to get checklists.',
	},

	// ----------------------------------
	//         checklist:deleteCheckItem
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
					'deleteCheckItem',
				],
				resource: [
					'checklist',
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
					'deleteCheckItem',
				],
				resource: [
					'checklist',
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
					'deleteCheckItem',
				],
				resource: [
					'checklist',
				],
			},
		},
		description: 'The ID of the card that checklist belongs to.'
	},
	{
		displayName: 'Checklist ID',
		name: 'checklistId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChecklists',
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
					'deleteCheckItem',
				],
				resource: [
					'checklist',
				],
			},
		},
		description: 'The ID of the checklist that card belongs to.',
	},
	{
		displayName: 'Item ID',
		name: 'itemId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChecklistItems',
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
				checklistId: [
					'',
				],
			},
			show: {
				operation: [
					'deleteCheckItem',
				],
				resource: [
					'checklist',
				],
			},
		},
		description: 'The ID of the checklist item to delete.',
	},

	// ----------------------------------
	//         checklist:getCheckItem
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
					'getCheckItem',
				],
				resource: [
					'checklist',
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
					'getCheckItem',
				],
				resource: [
					'checklist',
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
					'getCheckItem',
				],
				resource: [
					'checklist',
				],
			},
		},
		description: 'The ID of the card that checklist belongs to.'
	},
	{
		displayName: 'Checklist ID',
		name: 'checklistId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChecklists',
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
				cardId: [
					'',
				],
			},
			show: {
				operation: [
					'getCheckItem',
				],
				resource: [
					'checklist',
				],
			},
		},
		description: 'The ID of the checklist that card belongs to.',
	},
	{
		displayName: 'Item ID',
		name: 'itemId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChecklistItems',
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
				checklistId: [
					'',
				],
			},
			show: {
				operation: [
					'getCheckItem',
				],
				resource: [
					'checklist',
				],
			},
		},
		description: 'The ID of the checklist item to get.',
	},

	// ----------------------------------
	//         checklist:updateCheckItem
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
					'updateCheckItem',
				],
				resource: [
					'checklist',
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
					'updateCheckItem',
				],
				resource: [
					'checklist',
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
					'updateCheckItem',
				],
				resource: [
					'checklist',
				],
			},
		},
		description: 'The ID of the card that checklist belongs to.'
	},
	{
		displayName: 'Checklist ID',
		name: 'checklistId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChecklists',
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
					'updateCheckItem',
				],
				resource: [
					'checklist',
				],
			},
		},
		description: 'The ID of the checklist that card belongs to.',
	},
	{
		displayName: 'Item ID',
		name: 'itemId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChecklistItems',
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
				checklistId: [
					'',
				],
			},
			show: {
				operation: [
					'updateCheckItem',
				],
				resource: [
					'checklist',
				],
			},
		},
		description: 'The ID of the checklist item to update.',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'updateCheckItem',
				],
				resource: [
					'checklist',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'The new title for the checklist item.',
			},
			{
				displayName: 'Finished',
				name: 'isFinished',
				type: 'boolean',
				default: false,
				description: 'Item is checked',
			},
		],
	},

] as INodeProperties[];
