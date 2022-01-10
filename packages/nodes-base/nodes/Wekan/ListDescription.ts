import {
	INodeProperties,
} from 'n8n-workflow';

export const listOperations: INodeProperties[] = [
	// ----------------------------------
	//         list
	// ----------------------------------
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'list',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new list',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a list',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get the data of a list',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all board lists',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const listFields: INodeProperties[] = [
	// ----------------------------------
	//         list:create
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
					'list',
				],
			},
		},
		description: 'The ID of the board the list should be created in',
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
				operation: [
					'create',
				],
				resource: [
					'list',
				],
			},
		},
		description: 'The title of the list.',
	},

	// ----------------------------------
	//         list:delete
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
					'list',
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
					'delete',
				],
				resource: [
					'list',
				],
			},
		},
		description: 'The ID of the list to delete.',
	},

	// ----------------------------------
	//         list:get
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
					'list',
				],
			},
		},
		description: 'The ID of the board that list belongs to.',
	},
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'list',
				],
			},
		},
		description: 'The ID of the list to get.',
	},

	// ----------------------------------
	//         list:getAll
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
					'list',
				],
			},
		},
		description: 'ID of the board where the lists are in.',
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
					'list',
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
					'list',
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
