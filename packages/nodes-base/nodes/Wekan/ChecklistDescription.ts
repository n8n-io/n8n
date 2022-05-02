import {
	INodeProperties,
} from 'n8n-workflow';

export const checklistOperations: INodeProperties[] = [
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
				name: 'Get',
				value: 'get',
				description: 'Get the data of a checklist',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Returns all checklists for the card',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},

];

export const checklistFields: INodeProperties[] = [
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
		description: 'The ID of the board where the card is in.',
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
		type: 'string',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Item',
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
		default: [],
		description: 'Items to be added to the checklist.',
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
		description: 'The ID of the board that list belongs to.',
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
					'checklist',
				],
			},
		},
		description: 'The ID of the card to get checklists.',
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
					'checklist',
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
					'checklist',
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
