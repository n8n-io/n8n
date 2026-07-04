import type { INodeProperties } from 'n8n-workflow';

export const deckFields: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['deck'],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
		options: [
			// -------- Board --------
			{
				name: 'Create Board',
				value: 'createBoard',
				description: 'Create a new board',
				action: 'Create a board',
			},
			{
				name: 'Delete Board',
				value: 'deleteBoard',
				description: 'Delete a board',
				action: 'Delete a board',
			},
			{
				name: 'Get Board',
				value: 'getBoard',
				description: 'Get a board by ID',
				action: 'Get a board',
			},
			{
				name: 'List Boards',
				value: 'listBoards',
				description: 'List all accessible boards',
				action: 'List boards',
			},
			{
				name: 'Update Board',
				value: 'updateBoard',
				description: 'Update a board',
				action: 'Update a board',
			},
			// -------- Stack --------
			{
				name: 'Create Stack',
				value: 'createStack',
				description: 'Create a new stack in a board',
				action: 'Create a stack',
			},
			{
				name: 'Delete Stack',
				value: 'deleteStack',
				description: 'Delete a stack',
				action: 'Delete a stack',
			},
			{
				name: 'Get Stack',
				value: 'getStack',
				description: 'Get a stack by ID',
				action: 'Get a stack',
			},
			{
				name: 'List Stacks',
				value: 'listStacks',
				description: 'List stacks in a board',
				action: 'List stacks',
			},
			{
				name: 'Update Stack',
				value: 'updateStack',
				description: 'Update a stack',
				action: 'Update a stack',
			},
			// -------- Card --------
			{
				name: 'Archive Card',
				value: 'archiveCard',
				description: 'Archive a card',
				action: 'Archive a card',
			},
			{
				name: 'Assign Label',
				value: 'assignLabel',
				description: 'Assign a label to a card',
				action: 'Assign a label to a card',
			},
			{
				name: 'Assign User',
				value: 'assignUser',
				description: 'Assign a user to a card',
				action: 'Assign a user to a card',
			},
			{
				name: 'Create Card',
				value: 'createCard',
				description: 'Create a new card in a stack',
				action: 'Create a card',
			},
			{
				name: 'Delete Card',
				value: 'deleteCard',
				description: 'Delete a card',
				action: 'Delete a card',
			},
			{
				name: 'Get Card',
				value: 'getCard',
				description: 'Get a card by ID',
				action: 'Get a card',
			},
			{
				name: 'List Cards',
				value: 'listCards',
				description: 'List cards in a stack',
				action: 'List cards',
			},
			{
				name: 'Move Card',
				value: 'moveCard',
				description: 'Move or reorder a card',
				action: 'Move a card',
			},
			{
				name: 'Remove Label',
				value: 'removeLabel',
				description: 'Remove a label from a card',
				action: 'Remove a label from a card',
			},
			{
				name: 'Unassign User',
				value: 'unassignUser',
				description: 'Unassign a user from a card',
				action: 'Unassign a user from a card',
			},
			{
				name: 'Update Card',
				value: 'updateCard',
				description: 'Update a card',
				action: 'Update a card',
			},
			// -------- Label --------
			{
				name: 'Create Label',
				value: 'createLabel',
				description: 'Create a label on a board',
				action: 'Create a label',
			},
			{
				name: 'Delete Label',
				value: 'deleteLabel',
				description: 'Delete a label',
				action: 'Delete a label',
			},
			{
				name: 'Update Label',
				value: 'updateLabel',
				description: 'Update a label',
				action: 'Update a label',
			},
		],
		default: 'listBoards',
	},

	/* -------- Board -------- */
	{
		displayName: 'Board',
		name: 'boardId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The board to operate on',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getBoards',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. 123',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[0-9]+$',
							errorMessage: 'Board ID must be a number',
						},
					},
				],
			},
		],
		// Board is required by nearly every Deck operation because all entities
		// (stacks, cards, labels) are scoped within a board. The only exception
		// is listBoards which does not need a board selector.

		displayOptions: {
			show: {
				resource: ['deck'],
				operation: [
					'getBoard',
					'updateBoard',
					'deleteBoard',
					'listStacks',
					'createStack',
					'getStack',
					'updateStack',
					'deleteStack',
					'listCards',
					'createCard',
					'getCard',
					'updateCard',
					'deleteCard',
					'moveCard',
					'archiveCard',
					'assignLabel',
					'removeLabel',
					'assignUser',
					'unassignUser',
					'createLabel',
					'updateLabel',
					'deleteLabel',
				],
			},
		},
	},

	/* -------- Stack -------- */
	{
		displayName: 'Stack',
		name: 'stackId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The stack (column) to operate on',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getStacks',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. 456',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[0-9]+$',
							errorMessage: 'Stack ID must be a number',
						},
					},
				],
			},
		],
		// Stack (column) is required for all card operations and stack management.
		// Stacks are children of boards — the getStacks search method reads boardId
		// to populate the dropdown with only stacks from the selected board.

		displayOptions: {
			show: {
				resource: ['deck'],
				operation: [
					'getStack',
					'updateStack',
					'deleteStack',
					'listCards',
					'createCard',
					'getCard',
					'updateCard',
					'deleteCard',
					'moveCard',
					'archiveCard',
					'assignLabel',
					'removeLabel',
					'assignUser',
					'unassignUser',
				],
			},
		},
	},

	/* -------- Card -------- */
	{
		displayName: 'Card',
		name: 'cardId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The card to operate on',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getCards',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. 789',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[0-9]+$',
							errorMessage: 'Card ID must be a number',
						},
					},
				],
			},
		],
		// Card (task) is required for all card-level operations: read, update,
		// delete, move, archive, and label/user assignment. getCards reads both
		// boardId and stackId to populate the dropdown.

		displayOptions: {
			show: {
				resource: ['deck'],
				operation: [
					'getCard',
					'updateCard',
					'deleteCard',
					'moveCard',
					'archiveCard',
					'assignLabel',
					'removeLabel',
					'assignUser',
					'unassignUser',
				],
			},
		},
	},

	/* -------- Label -------- */
	{
		displayName: 'Label',
		name: 'labelId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The label to operate on',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getLabels',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. 321',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[0-9]+$',
							errorMessage: 'Label ID must be a number',
						},
					},
				],
			},
		],

		// Label is a board-scoped tag. getLabels fetches the selected board and
		// extracts its labels array. Used for assigning/removing labels from cards
		// and for label management (update, delete).

		displayOptions: {
			show: {
				resource: ['deck'],
				operation: ['assignLabel', 'removeLabel', 'updateLabel', 'deleteLabel'],
			},
		},
	},

	/* -------- User -------- */
	{
		displayName: 'User',
		name: 'userId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The user to assign or unassign',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getUsers',
					searchable: true,
				},
			},
			{
				displayName: 'By Username',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. john',
			},
		],

		// User assignment for cards. getUsers calls the OCS users endpoint
		// which is global (not board-scoped). Used for assignUser/unassignUser.

		displayOptions: {
			show: {
				resource: ['deck'],
				operation: ['assignUser', 'unassignUser'],
			},
		},
	},

	/* -------- Target Stack (Move Card) -------- */
	{
		displayName: 'Target Stack',
		name: 'targetStackId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The destination stack',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getStacks',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. 456',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[0-9]+$',
							errorMessage: 'Stack ID must be a number',
						},
					},
				],
			},
		],

		// Target stack for moveCard only. Reuses getStacks to list columns from
		// the same board so the user can pick a destination column.
		displayOptions: {
			show: {
				resource: ['deck'],
				operation: ['moveCard'],
			},
		},
	},

	// ----------------------------------
	//         deck:createBoard
	// ----------------------------------
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		description: 'The title of the board',
		displayOptions: { show: { resource: ['deck'], operation: ['createBoard'] } },
	},
	{
		displayName: 'Color',
		name: 'color',
		type: 'color',
		default: '#31CC7C',
		description: 'The color of the board in hex format',
		displayOptions: { show: { resource: ['deck'], operation: ['createBoard'] } },
	},

	// ----------------------------------
	//         deck:updateBoard
	// ----------------------------------
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		description: 'The new title of the board',
		displayOptions: { show: { resource: ['deck'], operation: ['updateBoard'] } },
	},
	{
		displayName: 'Color',
		name: 'color',
		type: 'color',
		default: '#31CC7C',
		description: 'The new color of the board in hex format',
		displayOptions: { show: { resource: ['deck'], operation: ['updateBoard'] } },
	},
	{
		displayName: 'Archived',
		name: 'archived',
		type: 'boolean',
		default: false,
		description: 'Whether the board is archived',
		displayOptions: { show: { resource: ['deck'], operation: ['updateBoard'] } },
	},

	// ----------------------------------
	//         deck:createStack
	// ----------------------------------
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		description: 'The title of the stack',
		displayOptions: { show: { resource: ['deck'], operation: ['createStack'] } },
	},
	{
		displayName: 'Order',
		name: 'order',
		type: 'number',
		default: 0,
		description: 'The order/position of the stack',
		displayOptions: { show: { resource: ['deck'], operation: ['createStack'] } },
	},

	// ----------------------------------
	//         deck:updateStack
	// ----------------------------------
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		description: 'The new title of the stack',
		displayOptions: { show: { resource: ['deck'], operation: ['updateStack'] } },
	},
	{
		displayName: 'Order',
		name: 'order',
		type: 'number',
		default: 0,
		description: 'The new order/position of the stack',
		displayOptions: { show: { resource: ['deck'], operation: ['updateStack'] } },
	},

	// ----------------------------------
	//         deck:createCard
	// ----------------------------------
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		description: 'The title of the card',
		displayOptions: { show: { resource: ['deck'], operation: ['createCard'] } },
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		description: 'The description of the card (plain text or markdown)',
		displayOptions: { show: { resource: ['deck'], operation: ['createCard'] } },
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		options: [{ name: 'Plain Text', value: 'plain' }],
		default: 'plain',
		description: 'The type of the card',
		displayOptions: { show: { resource: ['deck'], operation: ['createCard'] } },
	},
	{
		displayName: 'Order',
		name: 'order',
		type: 'number',
		default: 0,
		description: 'The order/position of the card',
		displayOptions: { show: { resource: ['deck'], operation: ['createCard'] } },
	},
	{
		displayName: 'Due Date',
		name: 'dueDate',
		type: 'dateTime',
		default: '',
		description: 'The due date of the card',
		displayOptions: { show: { resource: ['deck'], operation: ['createCard'] } },
	},

	// ----------------------------------
	//         deck:updateCard
	// ----------------------------------
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		description: 'The new title of the card',
		displayOptions: { show: { resource: ['deck'], operation: ['updateCard'] } },
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		description: 'The new description of the card',
		displayOptions: { show: { resource: ['deck'], operation: ['updateCard'] } },
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		options: [{ name: 'Plain Text', value: 'plain' }],
		default: 'plain',
		description: 'The new type of the card',
		displayOptions: { show: { resource: ['deck'], operation: ['updateCard'] } },
	},
	{
		displayName: 'Order',
		name: 'order',
		type: 'number',
		default: 0,
		description: 'The new order/position of the card',
		displayOptions: { show: { resource: ['deck'], operation: ['updateCard'] } },
	},
	{
		displayName: 'Due Date',
		name: 'dueDate',
		type: 'dateTime',
		default: '',
		description: 'The new due date of the card',
		displayOptions: { show: { resource: ['deck'], operation: ['updateCard'] } },
	},

	// ----------------------------------
	//         deck:moveCard
	// ----------------------------------
	{
		displayName: 'Order',
		name: 'order',
		type: 'number',
		default: 0,
		description: 'The new order/position in the target stack',
		displayOptions: { show: { resource: ['deck'], operation: ['moveCard'] } },
	},

	// ----------------------------------
	//         deck:archiveCard
	// ----------------------------------
	{
		displayName: 'Archived',
		name: 'archived',
		type: 'boolean',
		default: true,
		description: 'Whether the card is archived',
		displayOptions: { show: { resource: ['deck'], operation: ['archiveCard'] } },
	},

	// ----------------------------------
	//         deck:createLabel
	// ----------------------------------
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		description: 'The title of the label',
		displayOptions: { show: { resource: ['deck'], operation: ['createLabel'] } },
	},
	{
		displayName: 'Color',
		name: 'color',
		type: 'color',
		default: '#FF0000',
		description: 'The color of the label in hex format',
		displayOptions: { show: { resource: ['deck'], operation: ['createLabel'] } },
	},

	// ----------------------------------
	//         deck:updateLabel
	// ----------------------------------
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		description: 'The new title of the label',
		displayOptions: { show: { resource: ['deck'], operation: ['updateLabel'] } },
	},
	{
		displayName: 'Color',
		name: 'color',
		type: 'color',
		default: '#FF0000',
		description: 'The new color of the label in hex format',
		displayOptions: { show: { resource: ['deck'], operation: ['updateLabel'] } },
	},
];
