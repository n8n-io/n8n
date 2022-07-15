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
		noDataExpression: true,
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
				action: 'Delete a checklist item',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a checklist item',
				action: 'Get a checklist item',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a checklist item',
				action: 'Update a checklist item',
			},
		],
		default: 'getAll',
	},

];

export const checklistItemFields: INodeProperties[] = [
	// ----------------------------------
	//         checklistItem:delete
	// ----------------------------------
	{
		displayName: 'Board Name or ID',
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
		description: 'The ID of the board that card belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'List Name or ID',
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
		description: 'The ID of the list that card belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Card Name or ID',
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
		description: 'The ID of the card that checklistItem belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Checklist Name or ID',
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
		description: 'The ID of the checklistItem that card belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Checklist Item Name or ID',
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
		description: 'The ID of the checklistItem item to get. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},

	// ----------------------------------
	//         checklistItem:get
	// ----------------------------------
	{
		displayName: 'Board Name or ID',
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
		description: 'The ID of the board that card belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'List Name or ID',
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
		description: 'The ID of the list that card belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Card Name or ID',
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
		description: 'The ID of the card that checklistItem belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
		description: 'The ID of the checklistItem that card belongs to',
	},
	{
		displayName: 'Checklist Item Name or ID',
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
		description: 'The ID of the checklistItem item to get. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},

	// ----------------------------------
	//         checklistItem:update
	// ----------------------------------
	{
		displayName: 'Board Name or ID',
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
		description: 'The ID of the board that card belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'List Name or ID',
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
		description: 'The ID of the list that card belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Card Name or ID',
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
		description: 'The ID of the card that checklistItem belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'CheckList Name or ID',
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
		description: 'The ID of the checklistItem that card belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Checklist Item Name or ID',
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
		description: 'The ID of the checklistItem item to update. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
				description: 'The new title for the checklistItem item',
			},
			{
				displayName: 'Finished',
				name: 'isFinished',
				type: 'boolean',
				default: false,
				description: 'Whether the item is checked',
			},
		],
	},

];
