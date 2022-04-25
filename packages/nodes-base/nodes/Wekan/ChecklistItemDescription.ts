import {
	INodeProperties,
} from 'n8n-workflow';

export const checklistItemOperations: INodeProperties[] = [
	// ----------------------------------
	//         checklistItem
	// ----------------------------------
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'checklistItem',
				],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a checklist item',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a checklist item',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a checklist item',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},

];

export const checklistItemFields: INodeProperties[] = [
	// ----------------------------------
	//         checklistItem:delete
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
					'checklistItem',
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
					'checklistItem',
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
					'checklistItem',
				],
			},
		},
		description: 'The ID of the card that checklistItem belongs to.',
	},
	{
		displayName: 'Checklist ID',
		name: 'checklistId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChecklists',
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
					'checklistItem',
				],
			},
		},
		description: 'The ID of the checklistItem that card belongs to.',
	},
	{
		displayName: 'Checklist Item ID',
		name: 'checklistItemId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChecklistItems',
			loadOptionsDependsOn: [
				'boardId',
				'cardId',
				'checklistId',
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
					'checklistItem',
				],
			},
		},
		description: 'The ID of the checklistItem item to get.',
	},

	// ----------------------------------
	//         checklistItem:get
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
					'checklistItem',
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
					'checklistItem',
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
					'checklistItem',
				],
			},
		},
		description: 'The ID of the card that checklistItem belongs to.',
	},
	{
		displayName: 'Checklist ID',
		name: 'checklistId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'checklistItem',
				],
			},
		},
		description: 'The ID of the checklistItem that card belongs to.',
	},
	{
		displayName: 'Checklist Item ID',
		name: 'checklistItemId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChecklistItems',
			loadOptionsDependsOn: [
				'boardId',
				'cardId',
				'checklistId',
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
					'checklistItem',
				],
			},
		},
		description: 'The ID of the checklistItem item to get.',
	},

	// ----------------------------------
	//         checklistItem:update
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
					'update',
				],
				resource: [
					'checklistItem',
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
					'update',
				],
				resource: [
					'checklistItem',
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
					'update',
				],
				resource: [
					'checklistItem',
				],
			},
		},
		description: 'The ID of the card that checklistItem belongs to.',
	},
	{
		displayName: 'CheckList ID',
		name: 'checklistId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChecklists',
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
					'update',
				],
				resource: [
					'checklistItem',
				],
			},
		},
		description: 'The ID of the checklistItem that card belongs to.',
	},
	{
		displayName: 'Checklist Item ID',
		name: 'checklistItemId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChecklistItems',
			loadOptionsDependsOn: [
				'boardId',
				'cardId',
				'checklistId',
			],
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'checklistItem',
				],
			},
		},
		description: 'The ID of the checklistItem item to update.',
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
					'checklistItem',
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
				description: 'The new title for the checklistItem item.',
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

];
