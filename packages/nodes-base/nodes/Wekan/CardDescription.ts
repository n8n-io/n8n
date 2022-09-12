import { INodeProperties } from 'n8n-workflow';

export const cardOperations: INodeProperties[] = [
	// ----------------------------------
	//         card
	// ----------------------------------
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['card'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new card',
				action: 'Create a card',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a card',
				action: 'Delete a card',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a card',
				action: 'Get a card',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get all cards',
				action: 'Get many cards',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a card',
				action: 'Update a card',
			},
		],
		default: 'create',
	},
];

export const cardFields: INodeProperties[] = [
	// ----------------------------------
	//         card:create
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
				resource: ['card'],
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
				operation: ['create'],
				resource: ['card'],
			},
		},
		description:
			'The ID of the list to create card in. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		placeholder: 'My card',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['card'],
			},
		},
		description: 'The title of the card',
	},
	{
		displayName: 'Swimlane Name or ID',
		name: 'swimlaneId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getSwimlanes',
			loadOptionsDependsOn: ['boardId'],
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['card'],
			},
		},
		description:
			'The swimlane ID of the new card. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Author Name or ID',
		name: 'authorId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getUsers',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['card'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['card'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Assignee Names or IDs',
				name: 'assignees',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: [],
				description:
					'The new list of assignee IDs attached to the card. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'The new description of the card',
			},
			{
				displayName: 'Member Names or IDs',
				name: 'members',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: [],
				description:
					'The new list of member IDs attached to the card. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
		],
	},

	// ----------------------------------
	//         card:delete
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
				resource: ['card'],
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
				resource: ['card'],
			},
		},
		description:
			'The ID of the list that card belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Card Name or ID',
		name: 'cardId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCards',
			loadOptionsDependsOn: ['boardId', 'listId'],
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['card'],
			},
		},
		description:
			'The ID of the card to delete. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},

	// ----------------------------------
	//         card:get
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
				resource: ['card'],
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
				operation: ['get'],
				resource: ['card'],
			},
		},
		description:
			'The ID of the list that card belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Card ID',
		name: 'cardId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['card'],
			},
		},
		description: 'The ID of the card to get',
	},

	// ----------------------------------
	//         card:getAll
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
				resource: ['card'],
			},
		},
		description:
			'The ID of the board that list belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'From Object',
		name: 'fromObject',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['card'],
			},
		},
		options: [
			{
				name: 'List',
				value: 'list',
			},
			{
				name: 'Swimlane',
				value: 'swimlane',
			},
		],
		default: '',
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
				fromObject: ['list'],
				operation: ['getAll'],
				resource: ['card'],
			},
		},
		description:
			'The ID of the list that card belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Swimlane Name or ID',
		name: 'swimlaneId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getSwimlanes',
			loadOptionsDependsOn: ['boardId'],
		},
		default: '',
		displayOptions: {
			show: {
				fromObject: ['swimlane'],
				operation: ['getAll'],
				resource: ['card'],
			},
		},
		description:
			'The ID of the swimlane that card belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['card'],
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
				resource: ['card'],
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

	// ----------------------------------
	//         card:update
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
				operation: ['update'],
				resource: ['card'],
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
				operation: ['update'],
				resource: ['card'],
			},
		},
		description:
			'The ID of the list that card belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Card Name or ID',
		name: 'cardId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCards',
			loadOptionsDependsOn: ['boardId', 'listId'],
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['card'],
			},
		},
		description:
			'The ID of the card to update. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['card'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Author Name or ID',
				name: 'authorId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description:
					'Update the owner of the card. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Assignee Names or IDs',
				name: 'assignees',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: [],
				description:
					'The new list of assignee IDs attached to the card. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Color',
				name: 'color',
				type: 'options',
				options: [
					{
						value: 'black',
						name: 'Black',
					},
					{
						value: 'blue',
						name: 'Blue',
					},
					{
						value: 'crimson',
						name: 'Crimson',
					},
					{
						value: 'darkgreen',
						name: 'Darkgreen',
					},
					{
						value: 'gold',
						name: 'Gold',
					},
					{
						value: 'gray',
						name: 'Gray',
					},
					{
						value: 'green',
						name: 'Green',
					},
					{
						value: 'indigo',
						name: 'Indigo',
					},
					{
						value: 'lime',
						name: 'Lime',
					},
					{
						value: 'magenta',
						name: 'Magenta',
					},
					{
						value: 'mistyrose',
						name: 'Mistyrose',
					},
					{
						value: 'navy',
						name: 'Navy',
					},
					{
						value: 'orange',
						name: 'Orange',
					},
					{
						value: 'paleturquoise',
						name: 'Paleturquoise',
					},
					{
						value: 'peachpuff',
						name: 'Peachpuff',
					},
					{
						value: 'pink',
						name: 'Pink',
					},
					{
						value: 'plum',
						name: 'Plum',
					},
					{
						value: 'purple',
						name: 'Purple',
					},
					{
						value: 'red',
						name: 'Red',
					},
					{
						value: 'saddlebrown',
						name: 'Saddlebrown',
					},
					{
						value: 'silver',
						name: 'Silver',
					},
					{
						value: 'sky',
						name: 'Sky',
					},
					{
						value: 'slateblue',
						name: 'Slateblue',
					},
					{
						value: 'white',
						name: 'White',
					},
					{
						value: 'yellow',
						name: 'Yellow',
					},
				],
				default: '',
				description: 'The new color of the card',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'The new description of the card',
			},
			{
				displayName: 'Due At',
				name: 'dueAt',
				type: 'dateTime',
				default: '',
				description: 'The new due at field of the card',
			},
			{
				displayName: 'End At',
				name: 'endAt',
				type: 'dateTime',
				default: '',
				description: 'The new end at field of the card',
			},
			{
				displayName: 'Label IDs',
				name: 'labelIds',
				type: 'string',
				default: '',
				description: 'The label IDs attached to the card',
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
				description:
					'The new list ID of the card (move operation). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Member Names or IDs',
				name: 'members',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: [],
				description:
					'The new list of member IDs attached to the card. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Over Time',
				name: 'isOverTime',
				type: 'boolean',
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description: 'The new over time field of the card',
			},
			{
				displayName: 'Parent Name or ID',
				name: 'parentId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCards',
					loadOptionsDependsOn: ['boardId', 'listId'],
				},
				default: '',
				description:
					'The parent of the card. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Received At',
				name: 'receivedAt',
				type: 'dateTime',
				default: '',
				description: 'The new received at field of the card',
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'number',
				default: 0,
				description: 'The internally used sort value of a card',
			},
			{
				displayName: 'Spent Time',
				name: 'spentTime',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: '',
				description: 'The new spent time field of the card',
			},
			{
				displayName: 'Start At',
				name: 'startAt',
				type: 'dateTime',
				default: '',
				description: 'The new start at field of the card',
			},
			{
				displayName: 'Swimlane Name or ID',
				name: 'swimlaneId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getSwimlanes',
					loadOptionsDependsOn: ['boardId'],
				},
				default: '',
				description:
					'The new swimlane ID of the card. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'The new title of the card',
			},
		],
	},
];
