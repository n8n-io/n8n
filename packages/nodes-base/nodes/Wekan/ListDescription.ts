import { INodeProperties } from 'n8n-workflow';

export const listOperations: INodeProperties[] = [
	// ----------------------------------
	//         list
	// ----------------------------------
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['list'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new list',
				action: 'Create a list',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a list',
				action: 'Delete a list',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get the data of a list',
				action: 'Get a list',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get all board lists',
				action: 'Get many lists',
			},
		],
		default: 'create',
	},
];

export const listFields: INodeProperties[] = [
	// ----------------------------------
	//         list:create
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
				operation: ['create'],
				resource: ['list'],
			},
		},
		description:
			'The ID of the board the list should be created in. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		placeholder: 'My list',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['list'],
			},
		},
		description: 'The title of the list',
	},

	// ----------------------------------
	//         list:delete
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
				operation: ['delete'],
				resource: ['list'],
			},
		},
		description:
			'The ID of the board that list belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'List Name or ID',
		name: 'listId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getLists',
			loadOptionsDependsOn: ['boardId'],
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['list'],
			},
		},
		description:
			'The ID of the list to delete. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},

	// ----------------------------------
	//         list:get
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
				operation: ['get'],
				resource: ['list'],
			},
		},
		description:
			'The ID of the board that list belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['list'],
			},
		},
		description: 'The ID of the list to get',
	},

	// ----------------------------------
	//         list:getAll
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
				operation: ['getAll'],
				resource: ['list'],
			},
		},
		description:
			'ID of the board where the lists are in. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['list'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['list'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 200,
		},
		default: 100,
		description: 'Max number of results to return',
	},
];
